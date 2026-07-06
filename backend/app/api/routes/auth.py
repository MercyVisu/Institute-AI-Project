from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.schemas import LoginRequest, TokenResponse, RefreshTokenRequest, ForgotPasswordRequest
from app.services.auth.auth_service import authenticate_user, refresh_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT tokens."""
    return authenticate_user(db, login_data)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token using refresh token."""
    return refresh_access_token(db, data.refresh_token)


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send password reset email."""
    from app.models.user import User
    user = db.query(User).filter(User.email == data.email).first()
    if user:
        # In production, send reset email with token
        pass
    # Always return success to prevent email enumeration
    return {"message": "If the email exists, a password reset link has been sent."}


@router.post("/logout")
def logout():
    """Logout user (client-side token removal)."""
    return {"message": "Logged out successfully"}
