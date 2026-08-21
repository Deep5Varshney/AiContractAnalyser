from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models import User
from app.schemas import UserSyncRequest

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
            # Update fields
            user.last_login = now
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
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.is_active = False
        db.commit()
        db.refresh(user)
    return user

def delete_user_from_db(db: Session, user_id: str):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()
        return True
    return False