import json
import os
from sqlalchemy import create_engine, Column, String, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
}

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
    created_at = Column(DateTime)

def lambda_handler(event, context):
    db_url = os.environ.get("DATABASE_URL")

    # If your URL starts with postgresql://, force it to use psycopg2 explicitly:
    if db_url and db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    engine = create_engine(db_url) if db_url else None
    if not db_url:
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": "DATABASE_URL environment variable is missing in Lambda"})
        }

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        params = event.get('queryStringParameters') or {}
        user_id = params.get('user_id')

        if not user_id:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": "Missing user_id parameter"})
            }

        contracts = db.query(Contract).filter(Contract.user_id == user_id).all()
        
        result = []
        for c in contracts:
            result.append({
                "id": c.id,
                "user_id": c.user_id,
                "file_name": c.file_name,
                "file_type": c.file_type,
                "s3_key": c.s3_key,
                "status": c.status,
                "created_at": c.created_at.isoformat() if c.created_at else None
            })

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps(result)
        }
    except Exception as err:
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": str(err)})
        }
    finally:
        db.close()