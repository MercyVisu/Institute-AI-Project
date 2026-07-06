from app.workers.celery_worker import celery_app
from app.core.database import SessionLocal
from app.models.document import Document, DocumentChunk
from app.models.embedding import Embedding
from app.services.ai.embedding_service import generate_embedding, generate_embeddings_batch, count_tokens
import structlog
import httpx
from io import BytesIO

logger = structlog.get_logger()


def parse_pdf(content: bytes) -> str:
    """Parse PDF using PyMuPDF (best quality), then pdfminer, then OCR fallback."""

    # ── 1. PyMuPDF (fitz) — best text extraction for most PDFs ──────────────
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=content, filetype="pdf")
        pages_text = [page.get_text() for page in doc]
        text = "\n".join(pages_text).strip()
        if text:
            logger.info("pdf_parsed_with_fitz", chars=len(text))
            return text
    except Exception as e:
        logger.warning("fitz_parse_failed", error=str(e))

    # ── 2. pdfminer.six — handles complex encoding PDFs ──────────────────────
    try:
        from pdfminer.high_level import extract_text as pdfminer_extract
        from io import BytesIO as _BytesIO
        text = pdfminer_extract(_BytesIO(content)).strip()
        if text:
            logger.info("pdf_parsed_with_pdfminer", chars=len(text))
            return text
    except Exception as e:
        logger.warning("pdfminer_parse_failed", error=str(e))

    # ── 3. PyPDF2 — legacy fallback ───────────────────────────────────────────
    try:
        from PyPDF2 import PdfReader
        from io import BytesIO as _BytesIO
        reader = PdfReader(_BytesIO(content))
        text = "".join(page.extract_text() or "" for page in reader.pages).strip()
        if text:
            logger.info("pdf_parsed_with_pypdf2", chars=len(text))
            return text
    except Exception as e:
        logger.warning("pypdf2_parse_failed", error=str(e))

    # ── 4. OCR — scanned / image-only PDFs ───────────────────────────────────
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=content, filetype="pdf")
        ocr_parts = []
        for page in doc:
            try:
                pix = page.get_pixmap(dpi=200)
                img_bytes = pix.tobytes("png")
                ocr_parts.append(parse_image(img_bytes))
            except Exception as page_err:
                logger.warning("ocr_page_failed", page=page.number, error=str(page_err))
        text = "\n".join(t for t in ocr_parts if t).strip()
        if text:
            logger.info("pdf_parsed_with_ocr", chars=len(text))
            return text
    except Exception as e:
        logger.error("ocr_fallback_failed", error=str(e))

    return ""


def parse_docx(content: bytes) -> str:
    """Parse DOCX file content."""
    from docx import Document as DocxDocument
    doc = DocxDocument(BytesIO(content))
    return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])


def parse_txt(content: bytes) -> str:
    """Parse TXT file content."""
    return content.decode("utf-8", errors="ignore")


def parse_image(content: bytes) -> str:
    """Parse image using OCR."""
    from app.services.ai.ocr_service import extract_text_from_image
    return extract_text_from_image(content)


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk.strip())
        i += chunk_size - overlap
    return chunks


PARSERS = {
    "pdf": parse_pdf,
    "docx": parse_docx,
    "txt": parse_txt,
    "png": parse_image,
    "jpg": parse_image,
    "jpeg": parse_image,
}


@celery_app.task(name="process_document", bind=True, max_retries=3)
def process_document(self, document_id: str):
    """Process a document: parse, chunk, and generate embeddings."""
    db = SessionLocal()
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            logger.error("document_not_found", document_id=document_id)
            return

        document.status = "processing"
        db.commit()

        logger.info("processing_document", document_id=document_id, file_type=document.file_type)

        # Download file
        response = httpx.get(document.file_url, timeout=60)
        if response.status_code != 200:
            raise ValueError(f"Failed to download file: HTTP {response.status_code}")

        content = response.content

        # Parse file
        parser = PARSERS.get(document.file_type)
        if not parser:
            raise ValueError(f"Unsupported file type: {document.file_type}")

        text = parser(content)
        if not text.strip():
            raise ValueError("No text extracted from document")

        # Delete existing chunks
        db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).delete()
        db.commit()

        # Chunk text
        chunks = chunk_text(text)
        logger.info("document_chunked", document_id=document_id, chunk_count=len(chunks))

        # Create chunks and embeddings
        batch_size = 20
        total_chunks = 0

        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            embeddings = generate_embeddings_batch(batch)

            for j, (chunk_text_content, embedding_vector) in enumerate(zip(batch, embeddings)):
                chunk = DocumentChunk(
                    document_id=document.id,
                    tenant_id=document.tenant_id,
                    content=chunk_text_content,
                    chunk_index=i + j,
                    token_count=count_tokens(chunk_text_content),
                )
                db.add(chunk)
                db.flush()

                emb = Embedding(
                    chunk_id=chunk.id,
                    tenant_id=document.tenant_id,
                    embedding=embedding_vector,
                    token_count=chunk.token_count,
                )
                db.add(emb)
                total_chunks += 1

            db.commit()

        document.status = "completed"
        document.chunk_count = total_chunks
        db.commit()

        logger.info("document_processed", document_id=document_id, chunks=total_chunks)

    except Exception as e:
        logger.error("document_processing_failed", document_id=document_id, error=str(e))
        document = db.query(Document).filter(Document.id == document_id).first()
        if document:
            document.status = "failed"
            document.error_message = str(e)[:500]
            db.commit()
        raise self.retry(exc=e, countdown=60)

    finally:
        db.close()
