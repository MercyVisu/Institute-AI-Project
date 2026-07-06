from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User, UserRole
from app.schemas.schemas import UserCreate, UserUpdate, UserResponse, PaginatedResponse
from app.services.auth.auth_service import create_user
from typing import Optional
from uuid import UUID
import math

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=PaginatedResponse)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "ADMIN", "CLIENT_ADMIN"])),
):
    """List users with pagination and filters."""
    query = db.query(User)

    if current_user.role != UserRole.SUPER_ADMIN:
        query = query.filter(User.tenant_id == current_user.tenant_id)

    if search:
        query = query.filter(
            (User.full_name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )
    if role:
        query = query.filter(User.role == role)

    total = query.count()
    users = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_new_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "ADMIN", "CLIENT_ADMIN"])),
):
    """Create a new user."""
    if current_user.role != UserRole.SUPER_ADMIN:
        user_data.tenant_id = current_user.tenant_id
        if user_data.role in ["SUPER_ADMIN", "ADMIN"]:
            raise HTTPException(status_code=403, detail="Cannot create users with this role")

    user = create_user(db, user_data)
    return UserResponse.model_validate(user)


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
def update_current_user_profile(
    update_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user profile."""
    for field, value in update_data.model_dump(exclude_unset=True).items():
        if field not in ["role", "is_active"]:  # Users can't change their own role
            setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "ADMIN", "CLIENT_ADMIN"])),
):
    """Get user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if current_user.role != UserRole.SUPER_ADMIN and user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    update_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "ADMIN", "CLIENT_ADMIN"])),
):
    """Update user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if current_user.role != UserRole.SUPER_ADMIN and user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/{user_id}")
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "ADMIN"])),
):
    """Deactivate a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    user.is_active = False
    db.commit()
    return {"message": "User deactivated successfully"}
