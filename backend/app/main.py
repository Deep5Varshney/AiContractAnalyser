import traceback
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import engine, Base, get_db
from app.schemas import UserSyncRequest, UserResponse, UserLogoutRequest
from app.crud import sync_user, set_user_inactive, delete_user_from_db

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Contract Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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