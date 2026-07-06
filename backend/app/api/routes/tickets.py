from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_tenant_access, get_current_user
from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketReply, TicketStatus
from app.schemas.schemas import TicketCreate, TicketUpdate, TicketReplyCreate, TicketResponse, PaginatedResponse
from typing import Optional
from uuid import UUID
import math
import random
import string

router = APIRouter(prefix="/tickets", tags=["Tickets"])


def generate_ticket_number() -> str:
    chars = string.ascii_uppercase + string.digits
    return "TKT-" + "".join(random.choices(chars, k=8))


@router.post("", response_model=TicketResponse, status_code=201)
def create_ticket(
    data: TicketCreate,
    tenant_id: UUID = Query(...),
    db: Session = Depends(get_db),
):
    """Create a support ticket (public - from chatbot widget)."""
    ticket = Ticket(
        tenant_id=tenant_id,
        ticket_number=generate_ticket_number(),
        subject=data.subject,
        description=data.description,
        student_name=data.student_name,
        student_email=data.student_email,
        student_phone=data.student_phone,
        category=data.category,
        priority=data.priority,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return TicketResponse.model_validate(ticket)


@router.get("", response_model=PaginatedResponse)
def list_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """List tickets for tenant."""
    query = db.query(Ticket).filter(Ticket.tenant_id == current_user.tenant_id)

    if status:
        query = query.filter(Ticket.status == status)
    if priority:
        query = query.filter(Ticket.priority == priority)
    if search:
        query = query.filter(
            (Ticket.subject.ilike(f"%{search}%")) |
            (Ticket.ticket_number.ilike(f"%{search}%"))
        )

    total = query.count()
    tickets = query.order_by(Ticket.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=[TicketResponse.model_validate(t) for t in tickets],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Get ticket details."""
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id == current_user.tenant_id,
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return TicketResponse.model_validate(ticket)


@router.put("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: UUID,
    data: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Update ticket status/assignment."""
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id == current_user.tenant_id,
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(ticket, field, value)

    if data.status == "RESOLVED":
        from datetime import datetime, timezone
        ticket.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(ticket)
    return TicketResponse.model_validate(ticket)


@router.post("/{ticket_id}/replies")
def add_ticket_reply(
    ticket_id: UUID,
    data: TicketReplyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Add a reply to a ticket."""
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id == current_user.tenant_id,
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    reply = TicketReply(
        ticket_id=ticket_id,
        message=data.message,
        is_internal=data.is_internal,
        replied_by=current_user.id,
        replied_by_name=current_user.full_name,
    )
    db.add(reply)
    db.commit()
    return {"message": "Reply added successfully"}


@router.get("/{ticket_id}/replies")
def get_ticket_replies(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Get all replies for a ticket."""
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id == current_user.tenant_id,
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    replies = db.query(TicketReply).filter(TicketReply.ticket_id == ticket_id).order_by(TicketReply.created_at).all()
    return [
        {
            "id": str(r.id),
            "message": r.message,
            "is_internal": r.is_internal,
            "replied_by_name": r.replied_by_name,
            "created_at": r.created_at.isoformat(),
        }
        for r in replies
    ]
