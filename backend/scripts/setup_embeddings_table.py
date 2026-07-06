#!/usr/bin/env python
"""Create embeddings table without pgvector (as JSON fallback)."""
import sys
sys.path.insert(0, ".")

from sqlalchemy import text
from app.core.database import engine
import structlog

logger = structlog.get_logger()

# Create embeddings table manually without pgvector vector type
with engine.connect() as conn:
    try:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS embeddings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                chunk_id UUID NOT NULL UNIQUE,
                tenant_id UUID NOT NULL,
                embedding TEXT NOT NULL,
                model VARCHAR(100) DEFAULT 'text-embedding-3-small',
                token_count INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                FOREIGN KEY (chunk_id) REFERENCES document_chunks(id) ON DELETE CASCADE,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            );
        """))
        conn.commit()
        logger.info("✅ embeddings table created (JSON fallback)")
        
        # Create indices
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_embeddings_tenant_id ON embeddings(tenant_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_embeddings_chunk_id ON embeddings(chunk_id);"))
        conn.commit()
        logger.info("✅ Indices created")
    except Exception as e:
        if "already exists" in str(e).lower():
            logger.info("ℹ️  embeddings table already exists")
        else:
            logger.error(f"❌ Failed to create embeddings table: {e}")
            sys.exit(1)

# Verify table exists
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
        
        # Show schema
        result = conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'embeddings'
            ORDER BY ordinal_position;
        """))
        print("\n📋 Table schema:")
        for row in result:
            print(f"   {row[0]}: {row[1]}")
    else:
        logger.error("❌ embeddings table does not exist")
        sys.exit(1)

print("\n✅ Setup complete! embeddings table ready (using JSON storage).")
