from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "EduAI"
    APP_ENV: str = "development"
    DEBUG: bool = True
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    # Database
    DATABASE_URL: str = "postgresql://postgres:admin123@localhost:5432/eduai_db"

    # JWT
    JWT_SECRET_KEY: str = "your_super_secret_key_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OpenAI
    OPENAI_API_KEY: str = ""

    # AI Provider — switch between "openai" and "ollama"
    # For Ollama: install from https://ollama.com, then run: ollama pull llama3
    AI_PROVIDER: str = "openai"           # "openai" or "ollama"
    OLLAMA_BASE_URL: str = "http://localhost:11434/v1"

    # Model names — change these when using Ollama
    CHAT_MODEL: str = "gpt-3.5-turbo"          # Ollama: "llama3" or "mistral"
    EMBEDDING_MODEL: str = "text-embedding-3-small"  # Ollama: "nomic-embed-text"
    VISION_MODEL: str = "gpt-4o-mini"          # Ollama: "llava"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_BUCKET_NAME: str = "eduai-storage"
    AWS_REGION: str = "ap-south-1"

    # SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # PayU
    PAYU_MERCHANT_KEY: str = ""
    PAYU_SALT: str = ""

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
