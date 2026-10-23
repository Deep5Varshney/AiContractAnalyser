import json
import os
import boto3
import uuid
import io
import docx
import pypdf
from datetime import datetime
from sqlalchemy import create_engine, Column, String, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL")

# If your URL starts with postgresql://, force it to use psycopg2 explicitly:
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class Contract(Base):
    __tablename__ = "contracts"
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    s3_key = Column(String, nullable=False)
    extracted_text = Column(Text, nullable=True)
    status = Column(String, default="PROCESSING")
    created_at = Column(DateTime, default=datetime.utcnow)

textract_client = boto3.client('textract')

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
}

def lambda_handler(event, context):
    body = json.loads(event.get('body') or '{}')
    
    contract_id = body.get('contract_id') or str(uuid.uuid4())
    user_id = body.get('user_id') or "default_user"
    file_name = body.get('file_name') or body.get('contract_name') or "sample_contract.pdf"
    file_type = body.get('file_type', 'application/pdf')
    bucket_name = body.get('bucket_name') or os.environ.get("S3_BUCKET_NAME") or "ai-contract-vault"
    s3_key = body.get('s3_key') or body.get('file_key') or "uploads/sample_contract.pdf"

    db = SessionLocal()
    try:
        # 1. Store initial metadata
        contract = Contract(
            id=contract_id,
            user_id=user_id,
            file_name=file_name,
            file_type=file_type,
            s3_key=s3_key,
            status="PROCESSING",
            created_at=datetime.utcnow()
        )
        db.merge(contract)
        db.commit()

        # 2. Extract Document Content (Using python-docx for Word, pypdf for PDFs)
        extracted_content = ""
        s3_obj = boto3.client('s3').get_object(Bucket=bucket_name, Key=s3_key)
        file_stream = io.BytesIO(s3_obj['Body'].read())

        if file_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" or file_name.endswith('.docx'):
            doc = docx.Document(file_stream)
            extracted_content = "\n".join([p.text for p in doc.paragraphs if p.text])
        else:
            # Use pypdf to read text-based PDFs locally in Lambda
            reader = pypdf.PdfReader(file_stream)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_content += text + "\n"

        # 3. Mark completed and store extracted text
        contract.extracted_text = extracted_content
        contract.status = "ANALYZED"
        db.commit()

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"status": "SUCCESS", "contract_id": contract_id})
        }
    except Exception as err:
        db.rollback()
        try:
            failed_contract = db.query(Contract).filter(Contract.id == contract_id).first()
            if failed_contract:
                failed_contract.status = "FAILED"
                db.commit()
        except Exception:
            pass

        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": str(err)})
        }
    finally:
        db.close()