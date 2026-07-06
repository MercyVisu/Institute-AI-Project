from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_tenant_access
from app.models.user import User, UserRole
from app.models.chatbot import Chatbot
from app.models.analytics import Conversation, Message
from app.models.tenant import Tenant
from app.schemas.schemas import ChatbotCreate, ChatbotUpdate, ChatbotResponse, ChatRequest, ChatResponse
from app.services.ai.rag_service import generate_rag_response
from app.services.ai.whisper_service import transcribe_audio
from app.services.ai.ocr_service import extract_text_from_image
from app.services.ai.client import get_tenant_ai_client, get_tenant_models
from typing import Optional
from uuid import UUID, uuid4
import time

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


def _resolve_tenant_id(current_user: User, request: Request):
    """Get effective tenant_id: client users always have one; super-admins pass X-Tenant-ID header."""
    from uuid import UUID as _UUID
    from app.models.user import UserRole
    if current_user.role == UserRole.SUPER_ADMIN:
        raw = request.headers.get("X-Tenant-ID")
        if not raw:
            raise HTTPException(status_code=400, detail="tenant_id required")
        try:
            return _UUID(raw)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid tenant_id")
    return current_user.tenant_id


@router.get("/config", response_model=ChatbotResponse)
def get_chatbot_config(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Get chatbot configuration for current tenant."""
    tenant_id = _resolve_tenant_id(current_user, request)
    chatbot = db.query(Chatbot).filter(
        Chatbot.tenant_id == tenant_id,
        Chatbot.is_active == True,
    ).first()
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot not configured")
    return ChatbotResponse.model_validate(chatbot)


@router.post("/config", response_model=ChatbotResponse)
def create_chatbot_config(
    request: Request,
    data: ChatbotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Create chatbot configuration."""
    tenant_id = _resolve_tenant_id(current_user, request)
    existing = db.query(Chatbot).filter(Chatbot.tenant_id == tenant_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Chatbot already configured. Use PUT to update.")

    chatbot = Chatbot(
        tenant_id=tenant_id,
        name=data.name,
        welcome_message=data.welcome_message,
        primary_color=data.primary_color,
        position=data.position,
        ai_tone=data.ai_tone,
        suggested_prompts=data.suggested_prompts,
    )
    db.add(chatbot)
    db.commit()
    db.refresh(chatbot)
    return ChatbotResponse.model_validate(chatbot)


@router.put("/config", response_model=ChatbotResponse)
def update_chatbot_config(
    request: Request,
    data: ChatbotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Update chatbot configuration."""
    tenant_id = _resolve_tenant_id(current_user, request)
    chatbot = db.query(Chatbot).filter(Chatbot.tenant_id == tenant_id).first()
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot not configured")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(chatbot, field, value)
    db.commit()
    db.refresh(chatbot)
    return ChatbotResponse.model_validate(chatbot)


@router.post("/chat", response_model=ChatResponse)
def chat(
    data: ChatRequest,
    db: Session = Depends(get_db),
    tenant_id: UUID = Query(..., description="Tenant ID"),
):
    """Public chat endpoint for students."""
    chatbot = db.query(Chatbot).filter(
        Chatbot.tenant_id == tenant_id,
        Chatbot.is_active == True,
    ).first()
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    session_id = data.session_id or str(uuid4())

    # Get or create conversation
    conversation = db.query(Conversation).filter(
        Conversation.session_id == session_id,
        Conversation.tenant_id == tenant_id,
    ).first()

    if not conversation:
        conversation = Conversation(
            chatbot_id=chatbot.id,
            tenant_id=tenant_id,
            session_id=session_id,
        )
        db.add(conversation)
        db.flush()

    # Get chat history
    history_messages = db.query(Message).filter(
        Message.conversation_id == conversation.id,
    ).order_by(Message.created_at.desc()).limit(10).all()

    chat_history = [{"role": m.role, "content": m.content} for m in reversed(history_messages)]

    # Save user message
    user_msg = Message(
        conversation_id=conversation.id,
        tenant_id=tenant_id,
        role="user",
        content=data.message,
        input_type=data.input_type,
    )
    db.add(user_msg)

    # Resolve per-tenant AI settings
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    tenant_ai_cfg = (tenant.settings or {}).get("ai", {}) if tenant else {}
    try:
        ai_client = get_tenant_ai_client(tenant_ai_cfg)
    except ValueError:
        ai_client = None   # falls back to global client inside rag_service
    models = get_tenant_models(tenant_ai_cfg)

    # Generate RAG response
    start_time = time.time()
    response_text, sources = generate_rag_response(
        db=db,
        query=data.message,
        tenant_id=tenant_id,
        tone=chatbot.ai_tone,
        custom_instructions=chatbot.ai_instructions,
        chat_history=chat_history,
        ai_client=ai_client,
        chat_model=models["chat_model"],
    )
    response_time = time.time() - start_time

    # Save assistant message
    assistant_msg = Message(
        conversation_id=conversation.id,
        tenant_id=tenant_id,
        role="assistant",
        content=response_text,
        response_time=response_time,
        sources=sources,
    )
    db.add(assistant_msg)

    conversation.message_count = (conversation.message_count or 0) + 2
    db.commit()

    return ChatResponse(
        message=response_text,
        session_id=session_id,
        sources=sources,
        conversation_id=conversation.id,
    )


@router.post("/voice")
async def voice_chat(
    audio: UploadFile = File(...),
    tenant_id: UUID = Query(...),
    session_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Voice input chat - transcribes audio then sends to RAG."""
    audio_bytes = await audio.read()
    if len(audio_bytes) < 1000:
        raise HTTPException(status_code=400, detail="Audio too short. Please hold the mic button and speak clearly.")
    try:
        transcript = transcribe_audio(audio_bytes, audio.filename or "audio.webm")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    chat_data = ChatRequest(message=transcript, session_id=session_id, input_type="voice")
    # Reuse chat logic
    result = chat(data=chat_data, db=db, tenant_id=tenant_id)
    # Prepend the transcript so the user sees what was heard
    result.message = f'🎤 I heard: "{transcript}"\n\n{result.message}'
    return result


@router.post("/ocr")
async def ocr_chat(
    image: UploadFile = File(...),
    tenant_id: UUID = Query(...),
    session_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """OCR chat - analyzes image with OpenAI Vision then sends to RAG."""
    image_bytes = await image.read()
    try:
        extracted_text = extract_text_from_image(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="Could not analyze the image. Please try a clearer image.")

    chat_data = ChatRequest(message=extracted_text, session_id=session_id, input_type="image")
    return chat(data=chat_data, db=db, tenant_id=tenant_id)
