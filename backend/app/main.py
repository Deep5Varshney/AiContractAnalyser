import traceback
import os
import boto3
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import engine, Base, get_db, SessionLocal
from app.models import User
from app.schemas import UserSyncRequest, UserResponse, UserLogoutRequest
from app.crud import sync_user, set_user_inactive, delete_user_from_db

AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID", "")

cognito_client = boto3.client(
    "cognito-idp",
    region_name=AWS_REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Contract Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def prune_deleted_cognito_users():
    """Removes any PostgreSQL users that no longer exist in AWS Cognito."""
    if not USER_POOL_ID:
        return
    db = SessionLocal()
    try:
        db_users = db.query(User).all()
        for user in db_users:
            try:
                cognito_client.admin_get_user(
                    UserPoolId=USER_POOL_ID,
                    Username=user.email
                )
            except cognito_client.exceptions.UserNotFoundException:
                print(f"[CLEANUP] User {user.email} deleted from Cognito -> Deleting from PostgreSQL...")
                db.delete(user)
                db.commit()
            except Exception as check_err:
                print(f"[CLEANUP ERROR] Failed checking user {user.email}: {check_err}")
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    prune_deleted_cognito_users()

@app.post("/api/auth/sync-user", response_model=UserResponse)
def handle_user_sync(user_data: UserSyncRequest, db: Session = Depends(get_db)):
    try:
        return sync_user(db=db, user_data=user_data)
    except Exception as e:
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/logout")
def handle_logout(logout_data: UserLogoutRequest, db: Session = Depends(get_db)):
    try:
        set_user_inactive(db=db, user_id=logout_data.id)
        return {"status": "success", "message": "User marked as inactive"}
    except Exception as e:
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/cleanup-orphaned")
def manual_cleanup():
    """Endpoint to trigger orphaned user removal immediately."""
    prune_deleted_cognito_users()
    return {"status": "success", "message": "Orphaned database users cleaned up"}

@app.delete("/api/auth/delete-user/{user_id}")
def handle_delete_user(user_id: str, db: Session = Depends(get_db)):
    try:
        deleted = delete_user_from_db(db=db, user_id=user_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="User not found")
        return {"status": "success", "message": "User removed from database"}
    except Exception as e:
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))