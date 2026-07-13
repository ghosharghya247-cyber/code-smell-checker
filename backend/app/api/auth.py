from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.schemas import LoginRequestSchema, SignupRequestSchema, AuthResponseSchema, SessionResponseSchema, UserSchema
from app.models.database import User
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, decode_token
from fastapi import Header
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        return None

    try:
        token = authorization.replace("Bearer ", "")
        payload = decode_token(token)
        if not payload:
            return None
        return payload.get("user_id")
    except:
        return None


@router.post("/login", response_model=AuthResponseSchema)
async def login(request: LoginRequestSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"user_id": str(user.id)})
    return AuthResponseSchema(
        token=token,
        user=UserSchema(
            id=str(user.id),
            email=user.email,
            created_at=user.created_at.isoformat(),
        ),
    )


@router.post("/signup", response_model=AuthResponseSchema)
async def signup(request: SignupRequestSchema, db: Session = Depends(get_db)):
    if request.password != request.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"user_id": str(user.id)})
    return AuthResponseSchema(
        token=token,
        user=UserSchema(
            id=str(user.id),
            email=user.email,
            created_at=user.created_at.isoformat(),
        ),
    )


@router.get("/session", response_model=SessionResponseSchema)
async def get_session(user_id: Optional[str] = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user_id:
        return SessionResponseSchema(user=None, is_authenticated=False)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return SessionResponseSchema(user=None, is_authenticated=False)

    return SessionResponseSchema(
        user=UserSchema(
            id=str(user.id),
            email=user.email,
            created_at=user.created_at.isoformat(),
        ),
        is_authenticated=True,
    )


@router.post("/logout")
async def logout():
    return {"success": True}
