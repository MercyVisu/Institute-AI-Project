import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum
from sqlalchemy import Enum as SAEnum


class TicketStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class TicketPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    ticket_number = Column(String(20), unique=True, nullable=False)
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    student_name = Column(String(255), nullable=True)
    student_email = Column(String(255), nullable=True)
    student_phone = Column(String(20), nullable=True)
    status = Column(SAEnum(TicketStatus), default=TicketStatus.OPEN)
    priority = Column(SAEnum(TicketPriority), default=TicketPriority.MEDIUM)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    category = Column(String(100), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    tenant = relationship("Tenant", back_populates="tickets")
    replies = relationship("TicketReply", back_populates="ticket", cascade="all, delete-orphan")


class TicketReply(Base):
    __tablename__ = "ticket_replies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)
    replied_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    replied_by_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    ticket = relationship("Ticket", back_populates="replies")
