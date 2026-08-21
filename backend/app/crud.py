from datetime import datetime
from sqlalchemy.orm import Session
from app.models import User
from app.schemas import UserSyncRequest

def sync_user(db: Session, user_data: UserSyncRequest) -> User:
    # Check if user already exists
    user = db.query(User).filter(User.id == user_data.id).first()
    
    if not user:
        # Create new user on first signup/login
        user = User(
            id=user_data.id,
            email=user_data.email,
            name=user_data.name,
            created_at=datetime.utcnow(),
            last_login=datetime.utcnow()
        )
        db.add(user)
    else:
        # Update last login and name if changed
        user.last_login = datetime.utcnow()
        if user_data.name:
            user.name = user_data.name
            
    db.commit()
    db.refresh(user)
    return user