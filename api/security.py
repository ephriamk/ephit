import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from loguru import logger
from passlib.context import CryptContext
from pydantic import BaseModel

from open_notebook.domain.user import User


class TokenData(BaseModel):
    sub: Optional[str] = None


pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

_SECRET_KEY: Optional[str] = None
# Server instance ID - changes on each restart to invalidate all tokens
_SERVER_INSTANCE_ID: str = secrets.token_urlsafe(16)


def get_secret_key() -> str:
    global _SECRET_KEY
    if _SECRET_KEY:
        return _SECRET_KEY

    key = os.environ.get("JWT_SECRET", "")
    if not key:
        key = secrets.token_urlsafe(32)
        logger.warning(
            "JWT_SECRET is not set. Generated ephemeral key for this process. "
            "Set JWT_SECRET in the environment to enable stable sessions."
        )
    _SECRET_KEY = key
    return _SECRET_KEY


ALGORITHM = "HS256"
# Default 24 hours (1440 minutes) for better UX
# Users stay logged in for a full day instead of being kicked out every hour
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRES_MINUTES", "1440"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def get_server_instance_id() -> str:
    """Get the current server instance ID. Changes on each restart."""
    return _SERVER_INSTANCE_ID


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token with server instance ID.
    Tokens become invalid when the server restarts (instance ID changes).
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire,
        "sid": _SERVER_INSTANCE_ID,  # Server instance ID - invalidates tokens on restart
    })
    encoded_jwt = jwt.encode(to_encode, get_secret_key(), algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Validate JWT token and return current user.
    Tokens are invalidated on server restart via server instance ID check.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, get_secret_key(), algorithms=[ALGORITHM])
        
        # CRITICAL SECURITY: Check server instance ID
        # If server restarted, instance ID changed and token is invalid
        token_instance_id = payload.get("sid")
        if token_instance_id is None:
            # Old tokens without SID are invalid (backward compatibility - reject old tokens)
            logger.warning("Token rejected: missing server instance ID (old token format)")
            raise credentials_exception
        if token_instance_id != _SERVER_INSTANCE_ID:
            logger.warning(
                f"Token rejected: server instance ID mismatch. "
                f"Token SID: {token_instance_id[:8]}..., Current SID: {_SERVER_INSTANCE_ID[:8]}..."
            )
            raise credentials_exception
        
        subject: Optional[str] = payload.get("sub")
        if subject is None:
            raise credentials_exception
        token_data = TokenData(sub=subject)
    except JWTError as error:
        logger.warning(f"JWT decode error: {error}")
        raise credentials_exception

    try:
        user = await User.get(token_data.sub)
    except Exception:
        raise credentials_exception

    if not user or not user.is_active:
        raise credentials_exception

    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
