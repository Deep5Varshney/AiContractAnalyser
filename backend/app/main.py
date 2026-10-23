import traceback
import difflib
import io
import os
import json
import boto3
import uuid
import pypdf
import docx
from pydantic import BaseModel
from botocore.config import Config
from fastapi import FastAPI, Depends, HTTPException, APIRouter, HTTPException, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
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

class ChatRequest(BaseModel):
    question: str

# --- Models for Comparison ---
class ClauseDiff(BaseModel):
    change_type: str  # "ADDED", "REMOVED", "MODIFIED"
    old_text: str
    new_text: str
    significance_explanation: str

class ComparisonResponse(BaseModel):
    v1_contract_id: str
    v2_file_name: str
    diffs: list[dict]

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

@app.post("/api/contracts/{contract_id}/chat")
async def chat_with_contract(contract_id: str, payload: ChatRequest, db: Session = Depends(get_db)):
    # 1. Fetch contract and AI analysis from DB
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    analysis = db.query(ContractAnalysisResult).filter(ContractAnalysisResult.contract_id == contract_id).first()
    
    extracted_text = contract.extracted_text or "No extracted text available."
    
    # 2. Build analysis data string
    analysis_insights = "No prior AI analysis generated."
    if analysis:
        analysis_dict = {}
        # Try JSON field first
        if hasattr(analysis, 'analysis_data') and analysis.analysis_data:
            analysis_dict = analysis.analysis_data
        elif hasattr(analysis, 'result_json') and analysis.result_json:
            analysis_dict = analysis.result_json
        else:
            # Build manually from columns
            if hasattr(analysis, 'summary'): analysis_dict['summary'] = analysis.summary
            if hasattr(analysis, 'risks'): analysis_dict['risks'] = analysis.risks
            if hasattr(analysis, 'parties'): analysis_dict['parties'] = analysis.parties
            if hasattr(analysis, 'deadlines'): analysis_dict['deadlines'] = analysis.deadlines
            if hasattr(analysis, 'payment_terms'): analysis_dict['payment_terms'] = analysis.payment_terms
            
        if analysis_dict:
            analysis_insights = json.dumps(analysis_dict, indent=2)

    # 3. Prompt referencing BOTH sources
    prompt = f"""
    You are an expert AI legal co-pilot. You have access to both the original contract text and the pre-computed AI Analysis / Risk Assessment.

    Answer the user's question accurately using EITHER the AI Risk Analysis findings OR the contract text provided below.

    AI Risk Analysis Findings:
    {analysis_insights}

    Original Contract Text:
    {extracted_text}

    User Question: {payload.question}
    """
    
    try:
        completion = groq_client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1
        )
        answer = completion.choices[0].message.content
        return {"answer": answer}
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI response.")

@app.post("/api/contracts/{contract_id}/compare")
async def compare_contract_versions(
    contract_id: str, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    # 1. Fetch Version 1 from DB
    v1_contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not v1_contract:
        raise HTTPException(status_code=404, detail="Version 1 contract not found")
    
    v1_text = v1_contract.extracted_text or ""
    if not v1_text.strip():
        raise HTTPException(status_code=400, detail="Version 1 contract has no extracted text")

    # 2. Extract text from uploaded Version 2 file
    file_bytes = await file.read()
    filename = file.filename.lower()
    v2_text = ""

    try:
        if filename.endswith(".pdf"):
            pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            v2_text = "\n".join([page.extract_text() for page in pdf_reader.pages if page.extract_text()])
        elif filename.endswith(".docx"):
            doc = docx.Document(io.BytesIO(file_bytes))
            v2_text = "\n".join([p.text for p.text in doc.paragraphs if p.text])
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF or DOCX.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract text from revised file: {str(e)}")

    v1_text_trimmed = v1_text[:12000]
    v2_text_trimmed = v2_text[:12000]
    # 3. Prompt Groq LLM to analyze differences and legal significance
    prompt = f"""
    You are an expert AI legal co-pilot specializing in contract redlining and version comparison.
    Compare Original Contract (Version 1) with Revised Contract (Version 2).

    Identify key additions, deletions, or modifications between the two versions.
    For each change, explain its potential legal and financial significance.

    CRITICAL REQUIREMENT: Return ONLY a valid, raw JSON object with no preamble, markdown formatting, or code blocks.
    JSON structure:
    {{
        "changes": [
            {{
                "type": "MODIFIED",
                "clause_topic": "Termination Penalty",
                "old_text": "Clause text from V1",
                "new_text": "Clause text from V2",
                "significance": "Legal and financial impact."
            }}
        ]
    }}

    Original Contract (Version 1):
    {v1_text_trimmed}

    Revised Contract (Version 2):
    {v2_text_trimmed}
    """

    try:
        completion = groq_client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1
        )
        
        raw_content = completion.choices[0].message.content.strip()
        
        # Clean up Markdown backticks if present
        if raw_content.startswith("```"):
            lines = raw_content.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_content = "\n".join(lines).strip()

        result = json.loads(raw_content)
        changes = result.get("changes", [])
        
        return {
            "v1_contract_id": contract_id,
            "v1_file_name": v1_contract.file_name,
            "v2_file_name": file.filename,
            "changes": changes
        }
    except Exception as e:
        print(f"Comparison error: {e}")
        raise HTTPException(status_code=500, detail="Failed to run AI version comparison.")

@app.get("/api/contracts/{contract_id}/export/docx")
async def export_contract_docx(contract_id: str, db: Session = Depends(get_db)):
    # 1. Fetch contract and analysis result
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    analysis = db.query(ContractAnalysisResult).filter(ContractAnalysisResult.contract_id == contract_id).first()
    
    # 2. Extract data safely from analysis_json dictionary
    summary_text = "No summary available."
    risks_list = []
    parties_list = []
    deadlines_list = []
    payment_terms_list = []
    
    if analysis and analysis.analysis_json:
        data = analysis.analysis_json
        summary_text = data.get("summary", "No summary available.")
        risks_list = data.get("risks", [])
        parties_list = data.get("parties", [])
        deadlines_list = data.get("deadlines", [])
        payment_terms_list = data.get("payment_terms", [])
    elif analysis and hasattr(analysis, 'summary') and analysis.summary:
        summary_text = analysis.summary

    # 3. Build Word Document using python-docx
    doc = docx.Document()
    
    # Header Information
    doc.add_heading("Legal Co-Pilot Executive Report", level=1)
    doc.add_paragraph(f"Contract File: {contract.file_name}")
    doc.add_paragraph(f"Generated On: {contract.created_at if hasattr(contract, 'created_at') else 'N/A'}")
    
    # Executive Summary Section
    doc.add_heading("📌 Executive Summary", level=2)
    doc.add_paragraph(summary_text)
    
    # Risk Analysis & Clauses Section
    doc.add_heading("⚠️ Risk Analysis & Key Clauses", level=2)
    if risks_list and len(risks_list) > 0:
        for r in risks_list:
            p = doc.add_paragraph(style='List Bullet')
            title = r.get('title', 'Clause Risk')
            severity = r.get('severity', 'Medium').upper()
            reason = r.get('reason', '')
            recommendation = r.get('recommendation', '')
            
            p.add_run(f"{title} ({severity} Risk)\n").bold = True
            if reason:
                p.add_run(f"{reason}\n")
            if recommendation:
                p.add_run(f"💡 Recommendation: {recommendation}").italic = True
    else:
        doc.add_paragraph("No high-risk clauses or special remarks flagged.")

    # Contracting Parties Section
    if parties_list:
        doc.add_heading("🤝 Contracting Parties", level=2)
        for p in parties_list:
            doc.add_paragraph(f"{p.get('name', 'Party')} ({p.get('role', 'Role')})", style='List Bullet')

    # Deadlines & Payment Terms Section
    if deadlines_list or payment_terms_list:
        doc.add_heading("📅 Deadlines & Payment Terms", level=2)
        if deadlines_list:
            doc.add_paragraph("Deadlines / Notices:", style='Normal').runs[0].bold = True
            for d in deadlines_list:
                doc.add_paragraph(d, style='List Bullet')
        if payment_terms_list:
            doc.add_paragraph("Payment Terms:", style='Normal').runs[0].bold = True
            for pt in payment_terms_list:
                doc.add_paragraph(pt, style='List Bullet')

    # 4. Save to memory buffer and stream response
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    
    safe_filename = f"Executive_Report_{contract.file_name.rsplit('.', 1)[0]}.docx"
    
    return StreamingResponse(
        buffer, 
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={safe_filename}"}
    )