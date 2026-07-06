"""
Shared AI client factory.

Switch providers by setting AI_PROVIDER in .env:
  AI_PROVIDER=openai   → uses OpenAI API (default)
  AI_PROVIDER=ollama   → uses local Ollama (free, offline)

Ollama setup:
  1. Install from https://ollama.com
  2. Run: ollama pull llama3
  3. Run: ollama pull nomic-embed-text
  4. Run: ollama pull llava          (for image/OCR)
  5. Set in .env:
       AI_PROVIDER=ollama
       CHAT_MODEL=llama3
       EMBEDDING_MODEL=nomic-embed-text
       VISION_MODEL=llava
"""

from openai import OpenAI
from app.core.config import get_settings
import structlog

logger = structlog.get_logger()
_client: OpenAI | None = None


def get_ai_client() -> OpenAI:
    """Return a configured OpenAI-compatible client (OpenAI or Ollama) using global settings."""
    global _client
    if _client is None:
        settings = get_settings()
        if settings.AI_PROVIDER == "ollama":
            _client = OpenAI(
                api_key="ollama",           # Ollama ignores the key but needs a non-empty value
                base_url=settings.OLLAMA_BASE_URL,
            )
            logger.info("ai_provider", provider="ollama", base_url=settings.OLLAMA_BASE_URL)
        else:
            _client = OpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("ai_provider", provider="openai")
    return _client


def get_tenant_ai_client(tenant_ai_settings: dict) -> OpenAI:
    """
    Return an OpenAI-compatible client built from per-tenant AI settings.
    Falls back to global settings for any missing values.

    tenant_ai_settings is the dict stored in Tenant.settings["ai"], e.g.:
      {
        "ai_provider": "openai",
        "openai_api_key": "sk-...",
        "ollama_base_url": "http://localhost:11434/v1",
        "chat_model": "gpt-3.5-turbo",
        ...
      }
    """
    global_cfg = get_settings()
    provider = tenant_ai_settings.get("ai_provider", global_cfg.AI_PROVIDER)

    if provider == "ollama":
        base_url = tenant_ai_settings.get("ollama_base_url") or global_cfg.OLLAMA_BASE_URL
        return OpenAI(api_key="ollama", base_url=base_url)
    else:
        api_key = tenant_ai_settings.get("openai_api_key") or global_cfg.OPENAI_API_KEY
        if not api_key:
            raise ValueError("No OpenAI API key configured. Please set one in Settings → AI Configuration.")
        return OpenAI(api_key=api_key)


def get_tenant_models(tenant_ai_settings: dict) -> dict:
    """
    Return the effective model names for a tenant, merging tenant overrides with global defaults.
    Returns dict with keys: chat_model, embedding_model, vision_model.
    """
    global_cfg = get_settings()
    return {
        "chat_model": tenant_ai_settings.get("chat_model") or global_cfg.CHAT_MODEL,
        "embedding_model": tenant_ai_settings.get("embedding_model") or global_cfg.EMBEDDING_MODEL,
        "vision_model": tenant_ai_settings.get("vision_model") or global_cfg.VISION_MODEL,
    }


def reset_client():
    """Force re-initialization (useful for tests or provider switch)."""
    global _client
    _client = None
