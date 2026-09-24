


import json
import os
import boto3
from datetime import datetime
from sqlalchemy import create_engine, Column, String, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL")
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
    contract_id = body.get('contract_id')
    user_id = body.get('user_id')
    file_name = body.get('file_name')
    file_type = body.get('file_type', 'application/pdf')
    bucket_name = body.get('bucket_name')
    s3_key = body.get('s3_key')

    db = SessionLocal()
    try:
        # 1. Store initial metadata
        contract = Contract(
            id=contract_id,
            user_id=user_id,
            file_name=file_name,
            file_type=file_type,
            s3_key=s3_key,
            status="PROCESSING"
        )
        db.merge(contract)
        db.commit()

        # 2. Extract Document Content using Amazon Textract
        extracted_content = ""
        response = textract_client.detect_document_text(
            Document={'S3Object': {'Bucket': bucket_name, 'Name': s3_key}}
        )
        for block in response.get("Blocks", []):
            if block.get("BlockType") == "LINE":
                extracted_content += block.get("Text", "") + "\n"

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
        # Mark as failed in DB if record was created
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