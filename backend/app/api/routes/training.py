from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, BackgroundTasks, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_tenant_access
from app.models.user import User
from app.models.document import Document
from app.schemas.schemas import DocumentResponse, PaginatedResponse
from app.services.storage.s3_service import upload_to_s3, save_local_file
from app.models.document import DocumentChunk
from app.workers.training_tasks import PARSERS, chunk_text
from app.services.ai.embedding_service import count_tokens, generate_embedding
from app.services.ai.vector_service import store_embedding
import structlog
from typing import Optional
from uuid import UUID
import math

router = APIRouter(prefix="/training", tags=["Training"])

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "png", "jpg", "jpeg"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def _generate_embeddings_bg(document_id, tenant_id, chunk_data: list):
    """Background task: generate and store embeddings for all chunks of a document."""
    from app.core.database import SessionLocal
    from app.models.embedding import Embedding
    import json
    logger = structlog.get_logger()
    db = SessionLocal()
    try:
        success = 0
        for chunk_id, content in chunk_data:
            try:
                # Skip if embedding already exists
                exists = db.query(Embedding).filter(Embedding.chunk_id == chunk_id).first()
                if exists:
                    continue
                vector = generate_embedding(content)
                store_embedding(db=db, chunk_id=chunk_id, tenant_id=tenant_id, embedding_vector=vector)
                success += 1
            except Exception as e:
                logger.error("embedding_failed", chunk_id=str(chunk_id), error=str(e))
        logger.info("embeddings_generated", document_id=str(document_id), count=success, total=len(chunk_data))
    finally:
        db.close()


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Upload a document for AI training."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Resolve tenant: client users always have tenant_id; super-admin must pass it
    from uuid import UUID as _UUID
    from app.models.user import UserRole
    if current_user.role == UserRole.SUPER_ADMIN:
        raw_tid = tenant_id or request.headers.get("X-Tenant-ID")
        if not raw_tid:
            raise HTTPException(status_code=400, detail="Select a tenant before uploading as super-admin")
        try:
            resolved_tenant_id = _UUID(raw_tid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid tenant_id format")
    else:
        resolved_tenant_id = current_user.tenant_id

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Read contents to validate size
    try:
        contents = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read uploaded file: {e}")

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Max size is 50MB")

    # Save file locally
    logger = structlog.get_logger()
    try:
        file_url, size_bytes, local_path = await save_local_file(contents, folder="training", filename=file.filename)
    except Exception as e:
        logger.error("save_local_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {e}")

    document = Document(
        tenant_id=resolved_tenant_id,
        title=title or file.filename,
        file_name=file.filename,
        file_type=ext,
        file_url=file_url,
        file_size=size_bytes,
        category=category,
        status="processing",
        uploaded_by=current_user.id,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # Process document synchronously: parse → chunk → embeddings
    try:
        logger.info("start_processing_document", document_id=str(document.id), path=local_path)

        with open(local_path, "rb") as f:
            content = f.read()

        parser = PARSERS.get(document.file_type)
        if not parser:
            raise ValueError(f"Unsupported file type: {document.file_type}")

        text = parser(content)
        if not text or not text.strip():
            raise ValueError("No text could be extracted from this document. If it is a scanned PDF, ensure it contains readable content.")

        # Remove any existing chunks for this document
        db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).delete()
        db.commit()

        chunks = chunk_text(text)
        saved_chunks = []
        for i, chunk_content in enumerate(chunks):
            chunk = DocumentChunk(
                document_id=document.id,
                tenant_id=document.tenant_id,
                content=chunk_content,
                chunk_index=i,
                token_count=count_tokens(chunk_content),
            )
            db.add(chunk)
            saved_chunks.append(chunk)

        db.commit()
        # Refresh to get IDs
        for chunk in saved_chunks:
            db.refresh(chunk)

        document.status = "completed"
        document.chunk_count = len(saved_chunks)
        db.commit()
        logger.info("document_chunked", document_id=str(document.id), chunks=len(saved_chunks))

        # Generate embeddings in background so upload returns quickly
        document_id = document.id
        tenant_id = document.tenant_id
        chunk_data = [(chunk.id, chunk.content) for chunk in saved_chunks]
        background_tasks.add_task(_generate_embeddings_bg, document_id, tenant_id, chunk_data)

    except Exception as e:
        # Mark as failed but return 200 — file is saved, user can see the error in the list
        logger.error("document_processing_failed", document_id=str(document.id), error=str(e))
        document.status = "failed"
        document.error_message = str(e)[:500]
        db.commit()

    db.refresh(document)
    return DocumentResponse.model_validate(document)


@router.get("/documents", response_model=PaginatedResponse)
def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    tenant_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """List all training documents."""
    from app.models.user import UserRole
    from uuid import UUID as _UUID
    if current_user.role == UserRole.SUPER_ADMIN:
        # Super-admin can filter by tenant
        if tenant_id:
            try:
                tid = _UUID(tenant_id)
                query = db.query(Document).filter(Document.tenant_id == tid)
            except ValueError:
                query = db.query(Document).filter(False)
        else:
            query = db.query(Document)  # show all documents
    else:
        query = db.query(Document).filter(Document.tenant_id == current_user.tenant_id)

    if category:
        query = query.filter(Document.category == category)
    if status:
        query = query.filter(Document.status == status)
    if search:
        query = query.filter(Document.title.ilike(f"%{search}%"))

    total = query.count()
    docs = query.order_by(Document.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=[DocumentResponse.model_validate(d) for d in docs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.get("/documents/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Get document details."""
    from app.models.user import UserRole
    query = db.query(Document).filter(Document.id == document_id)
    if current_user.role != UserRole.SUPER_ADMIN:
        query = query.filter(Document.tenant_id == current_user.tenant_id)
    doc = query.first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse.model_validate(doc)


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Delete a training document and its embeddings."""
    from app.models.user import UserRole
    query = db.query(Document).filter(Document.id == document_id)
    if current_user.role != UserRole.SUPER_ADMIN:
        query = query.filter(Document.tenant_id == current_user.tenant_id)
    doc = query.first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    from app.services.storage.s3_service import delete_from_s3
    delete_from_s3(doc.file_url)

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}


@router.post("/documents/{document_id}/retrain")
def retrain_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_access),
):
    """Re-process a document for training."""
    from app.models.user import UserRole
    query = db.query(Document).filter(Document.id == document_id)
    if current_user.role != UserRole.SUPER_ADMIN:
        query = query.filter(Document.tenant_id == current_user.tenant_id)
    doc = query.first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.status = "pending"
    db.commit()

    from app.workers.training_tasks import process_document
    process_document.delay(str(document_id))

    return {"message": "Document queued for retraining"}
