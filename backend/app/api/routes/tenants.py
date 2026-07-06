from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_super_admin, get_current_user, require_tenant_access
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.schemas.schemas import TenantCreate, TenantUpdate, TenantResponse, PaginatedResponse, AISettingsSave, AISettingsResponse
from app.core.security import hash_password
from app.core.config import get_settings
from typing import Optional
from uuid import UUID
import math
import re

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.get("", response_model=PaginatedResponse)
def list_tenants(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """List all tenants (Super Admin only)."""
    query = db.query(Tenant)
    if search:
        query = query.filter(
            (Tenant.name.ilike(f"%{search}%")) | (Tenant.slug.ilike(f"%{search}%"))
        )
    total = query.count()
    tenants = query.order_by(Tenant.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=[TenantResponse.model_validate(t) for t in tenants],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.post("", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(
    data: TenantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """Create a new tenant with admin user."""
    slug = re.sub(r"[^a-z0-9]+", "-", data.slug.lower()).strip("-")
    existing = db.query(Tenant).filter(Tenant.slug == slug).first()
    if existing:
        raise HTTPException(status_code=409, detail="Tenant slug already exists")

    tenant = Tenant(
        name=data.name,
        slug=slug,
        institution_type=data.institution_type,
        email=data.email,
        phone=data.phone,
        address=data.address,
        city=data.city,
        state=data.state,
        country=data.country,
        website=data.website,
    )
    db.add(tenant)
    db.flush()

    # Create default admin user for tenant
    if data.email:
        admin_user = User(
            email=data.email,
            hashed_password=hash_password("changeme123"),
            full_name=f"{data.name} Admin",
            role=UserRole.CLIENT_ADMIN,
            tenant_id=tenant.id,
            is_active=True,
        )
        db.add(admin_user)

    db.commit()
    db.refresh(tenant)
    return TenantResponse.model_validate(tenant)


@router.get("/{tenant_id}", response_model=TenantResponse)
def get_tenant(
    tenant_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get tenant details."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if current_user.role != UserRole.SUPER_ADMIN and current_user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return TenantResponse.model_validate(tenant)


@router.put("/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: UUID,
    data: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """Update tenant."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tenant, field, value)
    db.commit()
    db.refresh(tenant)
    return TenantResponse.model_validate(tenant)


@router.delete("/{tenant_id}")
def deactivate_tenant(
    tenant_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """Deactivate a tenant."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant.is_active = False
    db.commit()
    return {"message": "Tenant deactivated successfully"}


# ───────────────── Per-tenant AI Settings ─────────────────

_DEFAULT_PROVIDER_MODELS = {
    "openai": {
        "chat_model": "gpt-3.5-turbo",
        "embedding_model": "text-embedding-3-small",
        "vision_model": "gpt-4o-mini",
    },
    "ollama": {
        "chat_model": "tinyllama",
        "embedding_model": "nomic-embed-text",
        "vision_model": "llava",
    },
}


@router.get("/me/ai-settings", response_model=AISettingsResponse)
def get_ai_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Get AI provider settings for the current tenant."""
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    ai = (tenant.settings or {}).get("ai", {})
    global_cfg = get_settings()
    provider = ai.get("ai_provider", global_cfg.AI_PROVIDER)
    defaults = _DEFAULT_PROVIDER_MODELS.get(provider, _DEFAULT_PROVIDER_MODELS["openai"])

    return AISettingsResponse(
        ai_provider=provider,
        openai_api_key_set=bool(ai.get("openai_api_key")),
        ollama_base_url=ai.get("ollama_base_url", global_cfg.OLLAMA_BASE_URL),
        chat_model=ai.get("chat_model") or defaults["chat_model"],
        embedding_model=ai.get("embedding_model") or defaults["embedding_model"],
        vision_model=ai.get("vision_model") or defaults["vision_model"],
    )


@router.put("/me/ai-settings", response_model=AISettingsResponse)
def update_ai_settings(
    data: AISettingsSave,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Save AI provider settings for the current tenant (CLIENT_ADMIN only)."""
    if current_user.role not in (UserRole.CLIENT_ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Only admins can change AI settings")

    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    settings = dict(tenant.settings or {})
    existing_key = (settings.get("ai") or {}).get("openai_api_key")

    ai_payload: dict = {"ai_provider": data.ai_provider, "ollama_base_url": data.ollama_base_url}

    # Preserve existing key if client sends empty/None (means "keep current")
    if data.openai_api_key:
        ai_payload["openai_api_key"] = data.openai_api_key
    elif existing_key:
        ai_payload["openai_api_key"] = existing_key

    if data.chat_model:
        ai_payload["chat_model"] = data.chat_model
    if data.embedding_model:
        ai_payload["embedding_model"] = data.embedding_model
    if data.vision_model:
        ai_payload["vision_model"] = data.vision_model

    settings["ai"] = ai_payload
    tenant.settings = settings
    db.commit()

    global_cfg = get_settings()
    provider = ai_payload["ai_provider"]
    defaults = _DEFAULT_PROVIDER_MODELS.get(provider, _DEFAULT_PROVIDER_MODELS["openai"])

    return AISettingsResponse(
        ai_provider=provider,
        openai_api_key_set=bool(ai_payload.get("openai_api_key")),
        ollama_base_url=ai_payload.get("ollama_base_url", global_cfg.OLLAMA_BASE_URL),
        chat_model=ai_payload.get("chat_model") or defaults["chat_model"],
        embedding_model=ai_payload.get("embedding_model") or defaults["embedding_model"],
        vision_model=ai_payload.get("vision_model") or defaults["vision_model"],
    )

