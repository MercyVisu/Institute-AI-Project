from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.schemas.schemas import LoginRequest, TokenResponse, UserResponse, UserCreate
from fastapi import HTTPException, status
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID


def authenticate_user(db: Session, login: LoginRequest) -> TokenResponse:
    """Authenticate user and return tokens."""
    user = db.query(User).filter(User.email == login.email).first()
    if not user or not verify_password(login.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    user.last_login = datetime.now(timezone.utc)
    db.commit()

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value if hasattr(user.role, 'value') else user.role,
        "tenant_id": str(user.tenant_id) if user.tenant_id else None,
    }

    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=UserResponse.model_validate(user),
    )


def refresh_access_token(db: Session, refresh_token: str) -> TokenResponse:
    """Refresh access token using refresh token."""
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == payload["sub"], User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value if hasattr(user.role, 'value') else user.role,
        "tenant_id": str(user.tenant_id) if user.tenant_id else None,
    }

    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=UserResponse.model_validate(user),
    )


def create_user(db: Session, user_data: UserCreate) -> User:
    """Create a new user."""
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        phone=user_data.phone,
        role=user_data.role,
        tenant_id=user_data.tenant_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
