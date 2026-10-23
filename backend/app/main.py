import traceback
import io
import os
import json
import boto3
import uuid
import pypdf
import docx
from botocore.config import Config
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from groq import Groq
from app.database import engine, Base, get_db, SessionLocal
from app.models import Contract, ContractAnalysisResult, User
from app.schemas import UserSyncRequest, UserResponse, UserLogoutRequest, PresignedUrlRequest, PresignedUrlResponse, ProcessContractRequest
from app.crud import sync_user, set_user_inactive, delete_user_from_db, create_contract_record, update_contract_text

AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID", "")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "ai-contract-vault")

# Initialize AWS clients for S3, Textract, and Cognito
s3_client = boto3.client(
    's3',
    region_name=AWS_REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    config=Config(signature_version='s3v4')
)

textract_client = boto3.client(
    'textract',
    region_name=AWS_REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

cognito_client = boto3.client(
    "cognito-idp",
    region_name=AWS_REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

# Initialize Groq Client for Lightning-Fast AI Analysis
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Contract Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def prune_deleted_cognito_users():
    """Removes any PostgreSQL users that no longer exist in AWS Cognito."""
    if not USER_POOL_ID:
        return
    db = SessionLocal()
    try:
        db_users = db.query(User).all()
        for user in db_users:
            try:
                cognito_client.admin_get_user(
                    UserPoolId=USER_POOL_ID,
                    Username=user.email
                )
            except cognito_client.exceptions.UserNotFoundException:
                print(f"[CLEANUP] User {user.email} deleted from Cognito -> Deleting from PostgreSQL...")
                db.delete(user)
                db.commit()
            except Exception as check_err:
                print(f"[CLEANUP ERROR] Failed checking user {user.email}: {check_err}")
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    prune_deleted_cognito_users()

@app.post("/api/auth/sync-user", response_model=UserResponse)
def handle_user_sync(user_data: UserSyncRequest, db: Session = Depends(get_db)):
    try:
        return sync_user(db=db, user_data=user_data)
    except Exception as e:
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/logout")
def handle_logout(logout_data: UserLogoutRequest, db: Session = Depends(get_db)):
    try:
        set_user_inactive(db=db, user_id=logout_data.id)
        return {"status": "success", "message": "User marked as inactive"}
    except Exception as e:
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/cleanup-orphaned")
def manual_cleanup():
    """Endpoint to trigger orphaned user removal immediately."""
    prune_deleted_cognito_users()
    return {"status": "success", "message": "Orphaned database users cleaned up"}

@app.delete("/api/auth/delete-user/{user_id}")
def handle_delete_user(user_id: str, db: Session = Depends(get_db)):
    try:
        deleted = delete_user_from_db(db=db, user_id=user_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="User not found")
        return {"status": "success", "message": "User removed from database"}
    except Exception as e:
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/contracts/upload-url", response_model=PresignedUrlResponse)
def get_upload_url(req: PresignedUrlRequest):
    try:
        ext = req.file_name.split('.')[-1]
        unique_key = f"contracts/{req.user_id}/{uuid.uuid4()}.{ext}"

        presigned_url = s3_client.generate_presigned_url(
            ClientMethod='put_object',
            Params={
                'Bucket': S3_BUCKET_NAME,
                'Key': unique_key,
                'ContentType': req.file_type
            },
            ExpiresIn=300
        )
        return {"upload_url": presigned_url, "s3_key": unique_key}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/contracts/process")
def process_document(req: ProcessContractRequest, db: Session = Depends(get_db)):
    try:
        # 1. Create DB record with PROCESSING status
        create_contract_record(
            db=db,
            contract_id=req.contract_id,
            user_id=req.user_id,
            file_name=req.file_name,
            s3_key=req.s3_key
        )

        # 2. Download file from S3 and extract text locally
        extracted_content = ""
        s3_obj = s3_client.get_object(Bucket=req.bucket_name, Key=req.s3_key)
        file_stream = io.BytesIO(s3_obj['Body'].read())

        if req.file_name.endswith('.docx') or 'wordprocessingml' in req.file_name:
            doc = docx.Document(file_stream)
            extracted_content = "\n".join([p.text for p in doc.paragraphs if p.text])
        else:
            reader = pypdf.PdfReader(file_stream)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_content += text + "\n"

        # 3. Update DB record to ANALYZED
        update_contract_text(db=db, contract_id=req.contract_id, extracted_text=extracted_content, status="ANALYZED")

        return {"status": "SUCCESS", "contract_id": req.contract_id}
    except Exception as e:
        update_contract_text(db=db, contract_id=req.contract_id, extracted_text="", status="FAILED")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/contracts")
def get_user_contracts(user_id: str, db: Session = Depends(get_db)):
    try:
        contracts = db.query(Contract).filter(Contract.user_id == user_id).order_by(Contract.created_at.desc()).all()
        return [
            {
                "id": c.id,
                "file_name": c.file_name,
                "file_type": c.file_type,
                "status": c.status,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in contracts
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/contracts/{contract_id}")
def get_contract_by_id(contract_id: str, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return {
        "id": contract.id,
        "user_id": contract.user_id,
        "file_name": contract.file_name,
        "file_type": contract.file_type,
        "s3_key": contract.s3_key,
        "extracted_text": contract.extracted_text,
        "status": contract.status,
        "created_at": contract.created_at.isoformat() if contract.created_at else None
    }

@app.post("/api/contracts/{contract_id}/analyze")
def trigger_ai_analysis(contract_id: str, db: Session = Depends(get_db)):
    try:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")

        if not contract.extracted_text:
            raise HTTPException(status_code=400, detail="No extracted text available for this contract.")

        contract.status = "PROCESSING"
        db.commit()

        # Construct Legal Analysis Prompt
        prompt = f"""You are an expert legal contract analysis assistant. Analyze the contract text below and extract insights into valid JSON format matching this exact schema structure:
{{
  "summary": "A concise summary of the contract.",
  "parties": [{{"name": "...", "role": "..."}}],
  "key_terms": ["..."],
  "obligations": ["..."],
  "deadlines": ["..."],
  "payment_terms": ["..."],
  "termination_conditions": ["..."],
  "renewal_terms": ["..."],
  "important_clauses": ["..."],
  "risks": [{{"title": "...", "severity": "low|medium|high", "reason": "...", "supporting_clause": "...", "recommendation": "..."}}]
}}

Rules:
- Use only information supported by the contract. Do not invent missing data.
- Return ONLY valid JSON block matching the structure above.

CONTRACT TEXT:
{contract.extracted_text[:15000]}
"""

        # Invoke Groq API with Llama 3.3 70B
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="openai/gpt-oss-20b",
            response_format={"type": "json_object"},
            temperature=0.1,
        )

        raw_answer = chat_completion.choices[0].message.content
        analysis_data = json.loads(raw_answer.strip())

        # Determine overall risk level based on findings
        highest_severity = "LOW"
        for r in analysis_data.get("risks", []):
            sev = r.get("severity", "").lower()
            if sev == "high":
                highest_severity = "HIGH"
                break
            elif sev == "medium" and highest_severity != "HIGH":
                highest_severity = "MEDIUM"

        # Save to ContractAnalysisResult table
        existing_analysis = db.query(ContractAnalysisResult).filter(ContractAnalysisResult.id == contract_id).first()
        if existing_analysis:
            existing_analysis.summary = analysis_data.get("summary")
            existing_analysis.analysis_json = analysis_data
        else:
            new_analysis = ContractAnalysisResult(
                id=contract_id,
                contract_id=contract_id,
                user_id=contract.user_id,
                summary=analysis_data.get("summary"),
                analysis_json=analysis_data
            )
            db.add(new_analysis)

        contract.status = "ANALYZED"
        contract.risk_level = highest_severity
        db.commit()

        return {"status": "SUCCESS", "contract_id": contract_id, "risk_level": highest_severity}

    except Exception as e:
        db.rollback()
        contract.status = "FAILED"
        db.commit()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/contracts/{contract_id}/analysis")
def get_contract_analysis(contract_id: str, db: Session = Depends(get_db)):
    analysis = db.query(ContractAnalysisResult).filter(ContractAnalysisResult.contract_id == contract_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found for this contract")
    return analysis.analysis_json

@app.get("/api/dashboard/summary")
def get_dashboard_summary(user_id: str, db: Session = Depends(get_db)):
    contracts = db.query(Contract).filter(Contract.user_id == user_id).all()
    total = len(contracts)
    completed = sum(1 for c in contracts if c.status == "ANALYZED")
    processing = sum(1 for c in contracts if c.status == "PROCESSING")
    high_risk = sum(1 for c in contracts if c.risk_level == "HIGH")
    
    return {
        "total_contracts": total,
        "completed": completed,
        "processing": processing,
        "high_risk": high_risk
    }