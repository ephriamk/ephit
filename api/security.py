import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from loguru import logger
from passlib.context import CryptContext
from pydantic import BaseModel

from open_notebook.config import DATA_FOLDER
from open_notebook.domain.user import User


class TokenData(BaseModel):
    sub: Optional[str] = None


pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

_SECRET_KEY: Optional[str] = None
# Server instance ID - persistent across restarts for better UX
# Only changes when explicitly rotated via SERVER_INSTANCE_ID env var
_SERVER_INSTANCE_ID: Optional[str] = None


def _get_instance_id_file_path() -> Path:
    """Get the path to the persistent server instance ID file."""
    data_path = Path(DATA_FOLDER)
    data_path.mkdir(parents=True, exist_ok=True)
    return data_path / ".server_instance_id"


def _load_or_create_server_instance_id() -> str:
    """
    Load server instance ID from persistent storage, or create a new one.
    The ID persists across server restarts for better UX.
    It can be manually rotated via SERVER_INSTANCE_ID environment variable.
    """
    # Check for manual override via environment variable (for security rotations)
    env_instance_id = os.environ.get("SERVER_INSTANCE_ID")
    if env_instance_id:
        logger.info("Using SERVER_INSTANCE_ID from environment variable")
        return env_instance_id
    
    # Try to load from persistent file
    instance_id_file = _get_instance_id_file_path()
    if instance_id_file.exists():
        try:
            instance_id = instance_id_file.read_text().strip()
            if instance_id:
                logger.debug(f"Loaded persistent server instance ID from {instance_id_file}")
                return instance_id
        except Exception as e:
            logger.warning(f"Failed to read server instance ID file: {e}. Creating new one.")
    
    # Create new instance ID and persist it
    new_instance_id = secrets.token_urlsafe(16)
    try:
        instance_id_file.write_text(new_instance_id)
        instance_id_file.chmod(0o600)  # Restrict permissions to owner only
        logger.info(f"Created new persistent server instance ID and saved to {instance_id_file}")
    except Exception as e:
        logger.warning(f"Failed to write server instance ID file: {e}. Using ephemeral ID.")
    
    return new_instance_id


def get_server_instance_id() -> str:
    """Get the current server instance ID. Persistent across restarts."""
    global _SERVER_INSTANCE_ID
    if _SERVER_INSTANCE_ID is None:
        _SERVER_INSTANCE_ID = _load_or_create_server_instance_id()
    return _SERVER_INSTANCE_ID


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


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token with server instance ID.
    Tokens remain valid across server restarts unless instance ID is manually rotated.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    instance_id = get_server_instance_id()
    to_encode.update({
        "exp": expire,
        "sid": instance_id,  # Server instance ID - can be rotated for security
    })
    encoded_jwt = jwt.encode(to_encode, get_secret_key(), algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Validate JWT token and return current user.
    Tokens are validated against persistent server instance ID.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, get_secret_key(), algorithms=[ALGORITHM])
        
        # SECURITY: Check server instance ID
        # Tokens remain valid across restarts unless instance ID was rotated
        current_instance_id = get_server_instance_id()
        token_instance_id = payload.get("sid")
        if token_instance_id is None:
            # Old tokens without SID are invalid (backward compatibility - reject old tokens)
            logger.warning("Token rejected: missing server instance ID (old token format)")
            raise credentials_exception
        if token_instance_id != current_instance_id:
            logger.warning(
                f"Token rejected: server instance ID mismatch. "
                f"Token SID: {token_instance_id[:8]}..., Current SID: {current_instance_id[:8]}... "
                f"(Instance ID was rotated - all users must re-authenticate)"
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
