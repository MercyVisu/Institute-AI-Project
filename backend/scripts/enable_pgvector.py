#!/usr/bin/env python
"""Enable pgvector extension and create embeddings table."""
import sys
sys.path.insert(0, ".")

from sqlalchemy import text
from app.core.database import engine, SessionLocal, Base
from app.models.embedding import Embedding  # noqa - import to register model
import structlog

logger = structlog.get_logger()

# Enable pgvector extension
with engine.connect() as conn:
    try:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()
        logger.info("✅ pgvector extension enabled")
    except Exception as e:
        logger.error(f"❌ Failed to enable pgvector: {e}")
        sys.exit(1)

# Now create all tables including embeddings
try:
    Base.metadata.create_all(bind=engine)
    logger.info("✅ All tables created (including embeddings)")
except Exception as e:
    logger.error(f"❌ Failed to create tables: {e}")
    sys.exit(1)

# Verify embeddings table exists
with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'embeddings'
        );
    """))
    table_exists = result.scalar()
    if table_exists:
        logger.info("✅ embeddings table confirmed to exist")
    else:
        logger.error("❌ embeddings table does not exist")
        sys.exit(1)

print("\n✅ Setup complete! pgvector is enabled and embeddings table ready.")
