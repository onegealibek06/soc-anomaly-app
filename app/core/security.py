from fastapi import Depends, HTTPException, Header, Security
from fastapi.security.api_key import APIKeyHeader
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
from app.core.config import settings
import jwt as pyjwt

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def decode_jwt(token: str) -> dict:
    return pyjwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGO])


def make_token(username: str, role: str) -> str:
    return pyjwt.encode(
        {"sub": username, "role": role,
         "exp": datetime.now(timezone.utc) + timedelta(hours=24)},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGO,
    )


async def verify_api_key(
    api_key: str = Security(api_key_header),
    authorization: str | None = Header(default=None),
):
    if api_key == settings.API_KEY:
        return api_key
    if authorization and authorization.startswith("Bearer "):
        try:
            decode_jwt(authorization.split(" ", 1)[1])
            return "jwt"
        except Exception:
            pass
    raise HTTPException(status_code=403, detail="Invalid API Key. Access Denied.")


def require_admin(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = decode_jwt(authorization.split(" ", 1)[1])
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalid or expired")
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload["sub"]
