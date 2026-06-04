from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from datetime import datetime, timezone, timedelta
from app.core.config import settings
from app.core.security import pwd_ctx, make_token, decode_jwt, require_admin
from app.core.deps import get_db
from app import models
import secrets

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    if db.query(models.User).filter(models.User.username == data.username).first():
        raise HTTPException(status_code=409, detail="Username already taken")
    is_first = db.query(models.User).count() == 0
    role = "admin" if (is_first or data.email == settings.ADMIN_EMAIL) else "analyst"
    user = models.User(
        email=data.email,
        username=data.username,
        hashed_password=pwd_ctx.hash(data.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = make_token(user.username, user.role)
    return {"access_token": token, "token_type": "bearer",
            "username": user.username, "role": user.role}


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not pwd_ctx.verify(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    token = make_token(user.username, user.role)
    return {"access_token": token, "token_type": "bearer",
            "username": user.username, "role": user.role}


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token   = token
        user.reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        return {"message": "Reset link sent", "demo_token": token}
    return {"message": "If that email is registered, a reset link has been sent"}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.reset_token == data.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    now_naive = datetime.utcnow()
    expires = user.reset_expires
    if expires:
        if expires.tzinfo is not None:
            expires = expires.replace(tzinfo=None)
        if expires < now_naive:
            raise HTTPException(status_code=400, detail="Reset token has expired")
    user.hashed_password = pwd_ctx.hash(data.new_password)
    user.reset_token     = None
    user.reset_expires   = None
    db.commit()
    return {"message": "Password updated successfully"}


@router.get("/me")
def get_me(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_jwt(authorization.split(" ", 1)[1])
        return {"username": payload["sub"], "role": payload.get("role", "analyst")}
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalid or expired")


@router.post("/promote")
def promote_to_admin(
    payload: dict,
    admin: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    email = payload.get("email", "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="email required")
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = "admin"
    db.commit()
    return {"message": f"{user.username} is now admin"}
