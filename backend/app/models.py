from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Text
from app.database import Base
from sqlalchemy.dialects.postgresql import JSONB

class User(Base):
    __tablename__ = "users"

    # User's Unique ID (e.g., Cognito Sub or UUID)
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class Contract(Base):
    __tablename__ = "contracts"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=True)
    s3_key = Column(String, nullable=False)
    extracted_text = Column(String, nullable=True)
    status = Column(String, default="PROCESSING")  # PROCESSING, ANALYZED, FAILED
    risk_level = Column(String, default="UNKNOWN") # LOW, MEDIUM, HIGH, UNKNOWN
    created_at = Column(DateTime, default=datetime.utcnow)

class ContractAnalysisResult(Base):
    __tablename__ = "contract_analyses"
    id = Column(String, primary_key=True, index=True)
    contract_id = Column(String, nullable=False, index=True)
    user_id = Column(String, nullable=False, index=True)
    summary = Column(Text, nullable=True)
    analysis_json = Column(JSONB, nullable=True) # Or Text if JSONB isn't enabled
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

