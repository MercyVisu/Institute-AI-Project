#!/usr/bin/env python
"""Debug script to check chatbot setup and embeddings for a tenant."""
import sys
sys.path.insert(0, ".")

# Import all models to ensure relationships are registered
from app.models import user, tenant, chatbot, document, embedding, ticket, lead, subscription, analytics  # noqa

from app.core.database import SessionLocal
from app.models.tenant import Tenant
from app.models.document import Document, DocumentChunk
from app.models.embedding import Embedding
from app.models.chatbot import Chatbot
import json

db = SessionLocal()

# Find tenant by name
tenant_name = "Mugilan Matric HR Sec School"
tenant = db.query(Tenant).filter(Tenant.name.ilike(f"%{tenant_name}%")).first()

if not tenant:
    print(f"❌ Tenant '{tenant_name}' not found")
    print("\nAvailable tenants:")
    tenants = db.query(Tenant).all()
    for t in tenants:
        print(f"  - {t.name} (slug: {t.slug})")
    sys.exit(1)

print(f"✅ Found tenant: {tenant.name}")
print(f"   ID: {tenant.id}")
print(f"   Slug: {tenant.slug}")
print(f"   Active: {tenant.is_active}\n")

# Check chatbot config
chatbot = db.query(Chatbot).filter(Chatbot.tenant_id == tenant.id).first()
if chatbot:
    print(f"✅ Chatbot configured:")
    print(f"   Name: {chatbot.name}")
    print(f"   Welcome: {chatbot.welcome_message[:60]}...")
    print(f"   Active: {chatbot.is_active}\n")
else:
    print(f"❌ No chatbot configured for this tenant\n")

# Check documents
docs = db.query(Document).filter(Document.tenant_id == tenant.id).all()
print(f"📄 Documents ({len(docs)}):")
for doc in docs:
    print(f"   - {doc.title}")
    print(f"     Status: {doc.status} | Chunks: {doc.chunk_count} | Size: {doc.file_size} bytes")

# Check document chunks
total_chunks = db.query(DocumentChunk).filter(DocumentChunk.tenant_id == tenant.id).count()
print(f"\n📦 Total chunks: {total_chunks}")
if total_chunks > 0:
    sample_chunks = db.query(DocumentChunk).filter(DocumentChunk.tenant_id == tenant.id).limit(3).all()
    print(f"   Sample chunks:")
    for chunk in sample_chunks:
        print(f"     [{chunk.chunk_index}] {chunk.content[:80]}...")

# Check embeddings
total_embeddings = db.query(Embedding).filter(Embedding.tenant_id == tenant.id).count()
print(f"\n🔢 Total embeddings: {total_embeddings}")

if total_embeddings == 0:
    print(f"   ⚠️  No embeddings found! This is likely why chatbot isn't working.")
    print(f"   Embeddings need to be created for the chatbot to use RAG.")
    print(f"   To fix:")
    print(f"   1. Ensure Celery worker is running")
    print(f"   2. Re-upload documents or use the Retrain button in UI")
elif total_embeddings < total_chunks:
    print(f"   ⚠️  Only {total_embeddings} embeddings for {total_chunks} chunks")
    print(f"   Missing embeddings: {total_chunks - total_embeddings}")
else:
    print(f"   ✅ All chunks have embeddings!")

# Summary
print(f"\n" + "="*60)
print("CHECKLIST:")
print("="*60)
print(f"[{'✅' if tenant.is_active else '❌'}] Tenant is active")
print(f"[{'✅' if chatbot and chatbot.is_active else '❌'}] Chatbot configured and active")
print(f"[{'✅' if total_chunks > 0 else '❌'}] Documents have chunks ({total_chunks})")
print(f"[{'✅' if total_embeddings == total_chunks else '❌'}] All chunks have embeddings ({total_embeddings}/{total_chunks})")

if total_embeddings == 0:
    print(f"\n⚠️  ACTION: Start Celery worker and re-upload or retrain documents")
    print(f"   Celery command: celery -A app.workers.celery_worker worker -Q training --loglevel=info")

db.close()
