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