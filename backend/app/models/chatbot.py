import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class Chatbot(Base):
    __tablename__ = "chatbots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False, default="AI Assistant")
    welcome_message = Column(Text, default="Hello! How can I help you today?")
    placeholder_text = Column(String(255), default="Type your question...")
    primary_color = Column(String(7), default="#7C3AED")
    position = Column(String(20), default="bottom-right")  # bottom-right, bottom-left
    avatar_url = Column(Text, nullable=True)
    ai_tone = Column(String(50), default="professional")  # professional, friendly, academic
    ai_instructions = Column(Text, nullable=True)
    suggested_prompts = Column(JSON, default=list)
    enable_voice = Column(Boolean, default=True)
    enable_image = Column(Boolean, default=True)
    enable_tickets = Column(Boolean, default=True)
    enable_lead_capture = Column(Boolean, default=True)
    branding = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    tenant = relationship("Tenant", back_populates="chatbots")
    conversations = relationship("Conversation", back_populates="chatbot")
