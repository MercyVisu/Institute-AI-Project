import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    domain = Column(String(255), nullable=True)
    logo_url = Column(Text, nullable=True)
    institution_type = Column(String(50), default="school")  # school, college, university
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), default="India")
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    settings = Column(JSON, default=dict)
    max_documents = Column(Integer, default=100)
    max_queries_per_day = Column(Integer, default=1000)
    is_active = Column(Boolean, default=True)
    subscription_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    users = relationship("User", back_populates="tenant")
    chatbots = relationship("Chatbot", back_populates="tenant")
    documents = relationship("Document", back_populates="tenant")
    tickets = relationship("Ticket", back_populates="tenant")
    leads = relationship("Lead", back_populates="tenant")
