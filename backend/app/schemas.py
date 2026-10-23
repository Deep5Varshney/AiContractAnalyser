from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserSyncRequest(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str] = None
    is_active: Optional[bool] = True

class UserLogoutRequest(BaseModel):
    id: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str]
    created_at: datetime
    last_login: datetime
    is_active: bool

    class Config:
        from_attributes = True

class PresignedUrlRequest(BaseModel):
    file_name: str
    file_type: str
    user_id: str

class PresignedUrlResponse(BaseModel):
    upload_url: str
    s3_key: str

class ProcessContractRequest(BaseModel):
    contract_id: str
    user_id: str
    file_name: str
    bucket_name: str
    s3_key: str

class AnalyzeContractTrigger(BaseModel):
    contract_id: str
    user_id: str

class RiskItem(BaseModel):
    title: str
    severity: str  # low, medium, high
    reason: str
    supporting_clause: Optional[str] = None
    recommendation: Optional[str] = None

class ContractAnalysisResponse(BaseModel):
    summary: Optional[str] = ""
    parties: list = []
    key_terms: list = []
    obligations: list = []
    deadlines: list = []
    payment_terms: list = []
    termination_conditions: list = []
    renewal_terms: list = []
    important_clauses: list = []
    risks: list = []

    class Config:
        from_attributes = True