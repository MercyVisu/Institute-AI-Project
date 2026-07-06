#!/usr/bin/env python
"""Generate embeddings for all document chunks."""
import sys
import os
sys.path.insert(0, ".")

# Load .env explicitly BEFORE importing settings (overrides any system env vars)
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"), override=True)

# Import all models
from app.models import user, tenant, chatbot, document, embedding, ticket, lead, subscription, analytics  # noqa

from app.core.database import SessionLocal
from app.models.tenant import Tenant
from app.models.document import DocumentChunk, Document
from app.models.embedding import Embedding
from app.services.ai.embedding_service import generate_embedding
from app.services.ai.vector_service import store_embedding
import structlog
import json

logger = structlog.get_logger()

# Get the target tenant (Mugilan)
db = SessionLocal()

tenant_name = "Mugilan matric hr sec school"
tenant = db.query(Tenant).filter(Tenant.name.ilike(f"%{tenant_name}%")).first()

if not tenant:
    logger.error(f"❌ Tenant '{tenant_name}' not found")
    sys.exit(1)

logger.info(f"Processing tenant: {tenant.name} (ID: {tenant.id})")

# Get all chunks that don't have embeddings
chunks_without_embeddings = db.query(DocumentChunk).filter(
    DocumentChunk.tenant_id == tenant.id,
    ~DocumentChunk.embedding.has()  # Where no embedding exists (one-to-one)
).all()

total = len(chunks_without_embeddings)
logger.info(f"Found {total} chunks without embeddings")

if total == 0:
    logger.info("✅ All chunks already have embeddings!")
    sys.exit(0)

# Generate embeddings
success_count = 0
error_count = 0

for idx, chunk in enumerate(chunks_without_embeddings, 1):
    try:
        # Generate embedding
        embedding_vector = generate_embedding(chunk.content)
        
        # Store embedding
        store_embedding(
            db=db,
            chunk_id=chunk.id,
            tenant_id=tenant.id,
            embedding_vector=embedding_vector,
        )
        
        success_count += 1
        
        # Log progress every 10 chunks
        if idx % 10 == 0 or idx == total:
            logger.info(f"Progress: {idx}/{total} embeddings generated")
            
    except Exception as e:
        error_count += 1
        logger.error(f"Failed to generate embedding for chunk {chunk.id}: {e}")

logger.info(f"\n✅ Complete!")
logger.info(f"   Generated: {success_count}/{total}")
logger.info(f"   Errors: {error_count}")

if success_count > 0:
    logger.info(f"\n💡 The chatbot should now work correctly!")
    logger.info(f"   Try asking a question related to the document content.")

db.close()
