from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean
from app.database import Base

class User(Base):
    __tablename__ = "users"

    # User's Unique ID (e.g., Cognito Sub or UUID)
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)