from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.chatbot import Chatbot
from app.models.tenant import Tenant
from app.schemas.schemas import ChatbotResponse
from uuid import UUID

router = APIRouter(prefix="/widget", tags=["Widget"])


@router.get("/config/{tenant_slug}")
def get_widget_config(
    tenant_slug: str,
    db: Session = Depends(get_db),
):
    """Get public widget configuration by tenant slug."""
    tenant = db.query(Tenant).filter(
        Tenant.slug == tenant_slug,
        Tenant.is_active == True,
    ).first()
    if not tenant:
        return {"error": "Institution not found"}

    chatbot = db.query(Chatbot).filter(
        Chatbot.tenant_id == tenant.id,
        Chatbot.is_active == True,
    ).first()
    if not chatbot:
        return {"error": "Chatbot not configured"}

    from app.core.config import get_settings
    settings = get_settings()
    # Disable image & voice in offline mode (Ollama doesn't support vision/audio)
    image_enabled = chatbot.enable_image and settings.AI_PROVIDER != "ollama"
    voice_enabled = chatbot.enable_voice and settings.AI_PROVIDER != "ollama"

    return {
        "tenant_id": str(tenant.id),
        "tenant_name": tenant.name,
        "tenant_logo": tenant.logo_url,
        "chatbot": {
            "name": chatbot.name,
            "welcome_message": chatbot.welcome_message,
            "placeholder_text": chatbot.placeholder_text,
            "primary_color": chatbot.primary_color,
            "position": chatbot.position,
            "avatar_url": chatbot.avatar_url,
            "suggested_prompts": chatbot.suggested_prompts,
            "enable_voice": voice_enabled,
            "enable_image": image_enabled,
            "enable_tickets": chatbot.enable_tickets,
            "enable_lead_capture": chatbot.enable_lead_capture,
        },
    }


@router.get("/embed-code/{tenant_slug}")
def get_embed_code(
    tenant_slug: str,
    db: Session = Depends(get_db),
):
    """Get embed code for the chat widget."""
    from app.core.config import get_settings
    settings = get_settings()

    return {
        "embed_code": f"""<!-- EduAI Chat Widget -->
<script>
  window.EDUAI_CONFIG = {{
    tenantSlug: '{tenant_slug}',
    apiUrl: '{settings.BACKEND_URL}'
  }};
</script>
<script src="{settings.FRONTEND_URL}/widget.js" async></script>"""
    }
