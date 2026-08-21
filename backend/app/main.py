from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import engine, Base, get_db
from app.schemas import UserSyncRequest, UserResponse
from app.crud import sync_user

# Auto-create tables in PostgreSQL on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Contract Analyzer API")

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/auth/sync-user", response_model=UserResponse)
def handle_user_sync(user_data: UserSyncRequest, db: Session = Depends(get_db)):
    try:
        return sync_user(db=db, user_data=user_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))