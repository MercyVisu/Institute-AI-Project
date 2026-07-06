from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, select
from app.core.database import get_db
from app.core.dependencies import require_tenant_access, require_super_admin, get_current_user
from app.models.user import User, UserRole
from app.models.analytics import Conversation, Message, Analytics
from app.models.document import Document
from app.models.ticket import Ticket
from app.models.lead import Lead
from app.models.tenant import Tenant
from app.schemas.schemas import AnalyticsSummary
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

router = APIRouter(prefix="/analytics", tags=["Analytics"])

# Simple in-memory TTL cache for tenant analytics summary to reduce DB load on frequent requests
# Key: str(tenant_id)  Value: (timestamp, summary_dict)
_SUMMARY_CACHE_TTL = 30  # seconds
_summary_cache = {}


@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Get analytics summary for tenant."""
    tenant_id = current_user.tenant_id
    cache_key = str(tenant_id)
    # return cached result when fresh
    cached = _summary_cache.get(cache_key)
    if cached:
        ts, data = cached
        if (datetime.now(timezone.utc) - ts).total_seconds() < _SUMMARY_CACHE_TTL:
            return AnalyticsSummary(**data)
    # Combine counts into a single query using scalar subqueries to reduce DB roundtrips
    total_conversations_sq = select(func.count(Conversation.id)).where(Conversation.tenant_id == tenant_id).scalar_subquery()
    total_messages_sq = select(func.count(Message.id)).where(Message.tenant_id == tenant_id).scalar_subquery()
    total_documents_sq = select(func.count(Document.id)).where(Document.tenant_id == tenant_id).scalar_subquery()
    total_tickets_sq = select(func.count(Ticket.id)).where(Ticket.tenant_id == tenant_id).scalar_subquery()
    total_leads_sq = select(func.count(Lead.id)).where(Lead.tenant_id == tenant_id).scalar_subquery()
    avg_response_sq = select(func.avg(Message.response_time)).where(
        Message.tenant_id == tenant_id,
        Message.role == "assistant",
        Message.response_time.isnot(None),
    ).scalar_subquery()

    stmt = select(
        total_conversations_sq.label("total_conversations"),
        total_messages_sq.label("total_messages"),
        total_documents_sq.label("total_documents"),
        total_tickets_sq.label("total_tickets"),
        total_leads_sq.label("total_leads"),
        avg_response_sq.label("avg_response_time"),
    )

    row = db.execute(stmt).first()
    if not row:
        return AnalyticsSummary(
            total_conversations=0,
            total_messages=0,
            total_documents=0,
            total_tickets=0,
            total_leads=0,
            avg_response_time=0.0,
        )

    result = {
        "total_conversations": int(row.total_conversations or 0),
        "total_messages": int(row.total_messages or 0),
        "total_documents": int(row.total_documents or 0),
        "total_tickets": int(row.total_tickets or 0),
        "total_leads": int(row.total_leads or 0),
        "avg_response_time": round(float(row.avg_response_time or 0.0), 2),
    }
    # cache the result
    try:
        _summary_cache[cache_key] = (datetime.now(timezone.utc), result)
    except Exception:
        pass

    return AnalyticsSummary(**result)


@router.get("/conversations/daily")
def get_daily_conversations(
    days: int = Query(30, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Get daily conversation counts."""
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    results = db.query(
        func.date(Conversation.created_at).label("date"),
        func.count(Conversation.id).label("count"),
    ).filter(
        Conversation.tenant_id == current_user.tenant_id,
        Conversation.created_at >= start_date,
    ).group_by(func.date(Conversation.created_at)).order_by(func.date(Conversation.created_at)).all()

    return [{"date": str(r.date), "count": r.count} for r in results]


@router.get("/messages/daily")
def get_daily_messages(
    days: int = Query(30, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Get daily message counts."""
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    results = db.query(
        func.date(Message.created_at).label("date"),
        func.count(Message.id).label("count"),
    ).filter(
        Message.tenant_id == current_user.tenant_id,
        Message.created_at >= start_date,
    ).group_by(func.date(Message.created_at)).order_by(func.date(Message.created_at)).all()

    return [{"date": str(r.date), "count": r.count} for r in results]


@router.get("/super-admin/overview")
def get_super_admin_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """Get platform-wide analytics for super admin."""
    total_tenants = db.query(func.count(Tenant.id)).scalar() or 0
    active_tenants = db.query(func.count(Tenant.id)).filter(Tenant.is_active == True).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_conversations = db.query(func.count(Conversation.id)).scalar() or 0
    total_messages = db.query(func.count(Message.id)).scalar() or 0
    total_documents = db.query(func.count(Document.id)).scalar() or 0

    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "total_users": total_users,
        "total_conversations": total_conversations,
        "total_messages": total_messages,
        "total_documents": total_documents,
    }
