import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text, Float, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum
from sqlalchemy import Enum as SAEnum


class PlanTier(str, enum.Enum):
    FREE = "FREE"
    STARTER = "STARTER"
    PROFESSIONAL = "PROFESSIONAL"
    ENTERPRISE = "ENTERPRISE"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    plan = Column(SAEnum(PlanTier), default=PlanTier.FREE)
    plan_name = Column(String(100), nullable=False)
    price = Column(Float, default=0.0)
    billing_cycle = Column(String(20), default="monthly")  # monthly, yearly
    max_documents = Column(Integer, default=10)
    max_queries = Column(Integer, default=100)
    max_users = Column(Integer, default=2)
    features = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    starts_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(String(50), default="pending")  # pending, success, failed, refunded
    payment_method = Column(String(50), default="payu")
    transaction_id = Column(String(255), nullable=True)
    payu_txn_id = Column(String(255), nullable=True)
    payment_metadata = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
