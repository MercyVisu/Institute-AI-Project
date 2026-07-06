from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


# ===== Auth Schemas =====
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


# ===== User Schemas =====
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2, max_length=255)
    phone: Optional[str] = None
    role: str = "CLIENT_USER"
    tenant_id: Optional[UUID] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    tenant_id: Optional[UUID] = None
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Tenant Schemas =====
class TenantCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    slug: str = Field(min_length=2, max_length=255)
    institution_type: str = "school"
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    website: Optional[str] = None


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    institution_type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    website: Optional[str] = None
    is_active: Optional[bool] = None
    max_documents: Optional[int] = None
    max_queries_per_day: Optional[int] = None


class TenantResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    institution_type: str
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    is_active: bool
    max_documents: int
    max_queries_per_day: int
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Chatbot Schemas =====
class ChatbotCreate(BaseModel):
    name: str = "AI Assistant"
    welcome_message: str = "Hello! How can I help you today?"
    primary_color: str = "#7C3AED"
    position: str = "bottom-right"
    ai_tone: str = "professional"
    suggested_prompts: list = []


class ChatbotUpdate(BaseModel):
    name: Optional[str] = None
    welcome_message: Optional[str] = None
    placeholder_text: Optional[str] = None
    primary_color: Optional[str] = None
    position: Optional[str] = None
    avatar_url: Optional[str] = None
    ai_tone: Optional[str] = None
    ai_instructions: Optional[str] = None
    suggested_prompts: Optional[list] = None
    enable_voice: Optional[bool] = None
    enable_image: Optional[bool] = None
    enable_tickets: Optional[bool] = None
    enable_lead_capture: Optional[bool] = None


class ChatbotResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    welcome_message: str
    placeholder_text: str
    primary_color: str
    position: str
    avatar_url: Optional[str] = None
    ai_tone: str
    suggested_prompts: list
    enable_voice: bool
    enable_image: bool
    enable_tickets: bool
    enable_lead_capture: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Document Schemas =====
class DocumentResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    title: str
    file_name: str
    file_type: str
    file_size: int
    category: Optional[str] = None
    status: str
    chunk_count: int
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Ticket Schemas =====
class TicketCreate(BaseModel):
    subject: str = Field(min_length=5, max_length=255)
    description: str = Field(min_length=10)
    student_name: Optional[str] = None
    student_email: Optional[EmailStr] = None
    student_phone: Optional[str] = None
    category: Optional[str] = None
    priority: str = "MEDIUM"


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[UUID] = None
    category: Optional[str] = None


class TicketReplyCreate(BaseModel):
    message: str = Field(min_length=1)
    is_internal: bool = False


class TicketResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    ticket_number: str
    subject: str
    description: str
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    status: str
    priority: str
    assigned_to: Optional[UUID] = None
    category: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ===== Lead Schemas =====
class LeadCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    course_interest: Optional[str] = None
    message: Optional[str] = None


class LeadUpdate(BaseModel):
    status: Optional[str] = None
    is_converted: Optional[bool] = None


class LeadResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    course_interest: Optional[str] = None
    message: Optional[str] = None
    source: str
    status: str
    is_converted: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Subscription Schemas =====
class SubscriptionCreate(BaseModel):
    plan: str = "FREE"
    plan_name: str
    price: float = 0.0
    billing_cycle: str = "monthly"
    max_documents: int = 10
    max_queries: int = 100
    max_users: int = 2


class SubscriptionResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    plan: str
    plan_name: str
    price: float
    billing_cycle: str
    max_documents: int
    max_queries: int
    max_users: int
    is_active: bool
    starts_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ===== Chat Schemas =====
class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    session_id: Optional[str] = None
    input_type: str = "text"


class ChatResponse(BaseModel):
    message: str
    session_id: str
    sources: list = []
    conversation_id: UUID


# ===== Analytics Schemas =====
class AnalyticsSummary(BaseModel):
    total_conversations: int = 0
    total_messages: int = 0
    total_documents: int = 0
    total_tickets: int = 0
    total_leads: int = 0
    avg_response_time: float = 0.0
    satisfaction_score: float = 0.0


# ===== Payment Schemas =====
class PaymentCreate(BaseModel):
    amount: float
    subscription_id: Optional[UUID] = None


class PaymentResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    amount: float
    currency: str
    status: str
    payment_method: str
    transaction_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Pagination =====
class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int


# ===== AI Settings Schemas =====
class AISettingsSave(BaseModel):
    ai_provider: str = "openai"          # "openai" or "ollama"
    openai_api_key: Optional[str] = None  # stored encrypted in tenant.settings
    ollama_base_url: str = "http://localhost:11434/v1"
    chat_model: Optional[str] = None
    embedding_model: Optional[str] = None
    vision_model: Optional[str] = None


class AISettingsResponse(BaseModel):
    ai_provider: str
    openai_api_key_set: bool            # never return the raw key
    ollama_base_url: str
    chat_model: str
    embedding_model: str
    vision_model: str


# Resolve forward reference
TokenResponse.model_rebuild()
