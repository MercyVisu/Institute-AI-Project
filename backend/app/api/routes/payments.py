from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_tenant_access, require_super_admin
from app.models.user import User
from app.models.subscription import Subscription, Payment
from app.schemas.schemas import SubscriptionCreate, SubscriptionResponse, PaymentCreate, PaymentResponse, PaginatedResponse
from app.services.payments.payu_service import generate_payu_hash, create_payment_record, get_payu_payment_url
from typing import Optional
from uuid import UUID
import math

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("/subscription", response_model=SubscriptionResponse)
def get_current_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Get current subscription for tenant."""
    sub = db.query(Subscription).filter(
        Subscription.tenant_id == current_user.tenant_id,
        Subscription.is_active == True,
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription")
    return SubscriptionResponse.model_validate(sub)


@router.post("/subscribe")
def create_subscription(
    data: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Create a subscription and initiate payment."""
    # Deactivate existing subscription
    existing = db.query(Subscription).filter(
        Subscription.tenant_id == current_user.tenant_id,
        Subscription.is_active == True,
    ).first()
    if existing:
        existing.is_active = False

    sub = Subscription(
        tenant_id=current_user.tenant_id,
        plan=data.plan,
        plan_name=data.plan_name,
        price=data.price,
        billing_cycle=data.billing_cycle,
        max_documents=data.max_documents,
        max_queries=data.max_queries,
        max_users=data.max_users,
    )
    db.add(sub)
    db.flush()

    if data.price > 0:
        payment = create_payment_record(db, current_user.tenant_id, data.price, sub.id)
        txn_hash = generate_payu_hash(
            str(payment.id), data.price, data.plan_name,
            current_user.full_name, current_user.email,
        )
        db.commit()
        return {
            "subscription_id": str(sub.id),
            "payment_id": str(payment.id),
            "payu_url": get_payu_payment_url(),
            "hash": txn_hash,
            "txnid": str(payment.id),
            "amount": data.price,
        }

    db.commit()
    return {"subscription_id": str(sub.id), "message": "Free plan activated"}


@router.post("/payu/callback")
def payu_callback(
    db: Session = Depends(get_db),
):
    """PayU payment callback handler."""
    return {"message": "Payment callback received"}


@router.get("/history", response_model=PaginatedResponse)
def payment_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Get payment history."""
    query = db.query(Payment).filter(Payment.tenant_id == current_user.tenant_id)
    total = query.count()
    payments = query.order_by(Payment.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=[PaymentResponse.model_validate(p) for p in payments],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.get("/all", response_model=PaginatedResponse)
def all_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """Get all payments (Super Admin)."""
    query = db.query(Payment)
    total = query.count()
    payments = query.order_by(Payment.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=[PaymentResponse.model_validate(p) for p in payments],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 1,
    )
