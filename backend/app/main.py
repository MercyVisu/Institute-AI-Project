# Load .env FIRST — override any system-level env vars (e.g. OPENAI_API_KEY)
# This must happen before any settings/services are imported.
from pathlib import Path as _Path
from dotenv import load_dotenv as _load_dotenv
_load_dotenv(_Path(__file__).resolve().parents[1] / ".env", override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.core.config import get_settings
from app.core.middleware import RequestLoggingMiddleware, TenantMiddleware, RateLimitMiddleware
from app.core.database import engine, Base

# Import all models so they are registered
from app.models import user, tenant, chatbot, document, embedding, ticket, lead, subscription, analytics  # noqa

from app.api.routes import auth, users, tenants, chatbot as chatbot_router, training, tickets, analytics as analytics_router, payments, leads, upload, widget

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Educational Chatbot Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware
app.add_middleware(RateLimitMiddleware)
app.add_middleware(TenantMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Serve locally saved uploads (fallback when S3 not configured)
uploads_dir = Path(__file__).resolve().parents[1] / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# API Routes
API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(tenants.router, prefix=API_PREFIX)
app.include_router(chatbot_router.router, prefix=API_PREFIX)
app.include_router(training.router, prefix=API_PREFIX)
app.include_router(tickets.router, prefix=API_PREFIX)
app.include_router(analytics_router.router, prefix=API_PREFIX)
app.include_router(payments.router, prefix=API_PREFIX)
app.include_router(leads.router, prefix=API_PREFIX)
app.include_router(upload.router, prefix=API_PREFIX)
app.include_router(widget.router, prefix=API_PREFIX)


@app.on_event("startup")
async def startup():
    import structlog
    _logger = structlog.get_logger()

    # Create tables — skip embeddings if pgvector extension is missing
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        if "vector" in str(e).lower():
            _logger.warning("pgvector extension not installed — creating tables without embeddings")
            from app.models.embedding import Embedding
            tables_without_vector = [
                t for t in Base.metadata.sorted_tables if t.name != Embedding.__tablename__
            ]
            Base.metadata.create_all(bind=engine, tables=tables_without_vector)
        else:
            raise

    # Create super admin if not exists
    from app.core.database import SessionLocal
    from app.models.user import User, UserRole
    from app.core.security import hash_password

    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
        if not admin:
            admin = User(
                email="admin@eduai.com",
                hashed_password=hash_password("admin123456"),
                full_name="Super Admin",
                role=UserRole.SUPER_ADMIN,
                is_active=True,
                is_verified=True,
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()


@app.get("/health")
def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": "1.0.0"}
