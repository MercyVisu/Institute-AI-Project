from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_tenant_access
from app.models.user import User
from app.models.lead import Lead
from app.schemas.schemas import LeadCreate, LeadUpdate, LeadResponse, PaginatedResponse
from typing import Optional
from uuid import UUID
import math

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.post("", response_model=LeadResponse, status_code=201)
def capture_lead(
    data: LeadCreate,
    tenant_id: UUID = Query(...),
    db: Session = Depends(get_db),
):
    """Capture a lead from chatbot widget (public)."""
    lead = Lead(
        tenant_id=tenant_id,
        name=data.name,
        email=data.email,
        phone=data.phone,
        course_interest=data.course_interest,
        message=data.message,
        source="chatbot",
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return LeadResponse.model_validate(lead)


@router.get("", response_model=PaginatedResponse)
def list_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """List all leads for tenant."""
    query = db.query(Lead).filter(Lead.tenant_id == current_user.tenant_id)

    if status:
        query = query.filter(Lead.status == status)
    if search:
        query = query.filter(
            (Lead.name.ilike(f"%{search}%")) | (Lead.email.ilike(f"%{search}%"))
        )

    total = query.count()
    leads = query.order_by(Lead.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=[LeadResponse.model_validate(l) for l in leads],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(
    lead_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Get lead details."""
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.tenant_id == current_user.tenant_id,
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadResponse.model_validate(lead)


@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: UUID,
    data: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Update lead status."""
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.tenant_id == current_user.tenant_id,
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)
    db.commit()
    db.refresh(lead)
    return LeadResponse.model_validate(lead)


@router.delete("/{lead_id}")
def delete_lead(
    lead_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Delete a lead."""
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.tenant_id == current_user.tenant_id,
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    db.delete(lead)
    db.commit()
    return {"message": "Lead deleted successfully"}
