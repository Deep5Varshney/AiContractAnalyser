from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models import User
from app.schemas import UserSyncRequest
from app.models import Contract

def sync_user(db: Session, user_data: UserSyncRequest) -> User:
    try:
        # Search by ID or Email
        user = db.query(User).filter(
            or_(User.id == user_data.id, User.email == user_data.email)
        ).first()

        now = datetime.utcnow()

        if not user:
            user = User(
                id=user_data.id,
                email=user_data.email,
                name=user_data.name,
                created_at=now,
                last_login=now,
                is_active=True,
            )
            db.add(user)
        else:
            user.last_login = now
            user.is_active = True
            if user_data.name:
                user.name = user_data.name
            if user_data.id and user.id != user_data.id:
                user.id = user_data.id

        db.commit()
        db.refresh(user)
        return user
    except Exception:
        db.rollback()
        raise

def set_user_inactive(db: Session, user_id: str):
    try:
        user = db.query(User).filter(
            or_(User.id == user_id, User.email == user_id)
        ).first()
        if user:
            user.is_active = False
            db.commit()
            db.refresh(user)
            return user
        return None
    except Exception:
        db.rollback()
        raise

def delete_user_from_db(db: Session, user_id: str) -> bool:
    try:
        user = db.query(User).filter(
            or_(User.id == user_id, User.email == user_id)
        ).first()
        if user:
            db.delete(user)
            db.commit()
            return True
        return False
    except Exception:
        db.rollback()
        raise

def create_contract_record(db: Session, contract_id: str, user_id: str, file_name: str, s3_key: str):
    contract = Contract(
        id=contract_id,
        user_id=user_id,
        file_name=file_name,
        s3_key=s3_key,
        status="PROCESSING"
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return contract

def update_contract_text(db: Session, contract_id: str, extracted_text: str, status: str = "ANALYZED"):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if contract:
        contract.extracted_text = extracted_text
        contract.status = status
        db.commit()
        db.refresh(contract)
    return contract