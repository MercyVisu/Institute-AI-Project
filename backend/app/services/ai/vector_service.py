from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.embedding import Embedding
from app.services.ai.embedding_service import generate_embedding
from typing import List, Tuple
from uuid import UUID
import json
import math


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    mag1 = math.sqrt(sum(a * a for a in vec1))
    mag2 = math.sqrt(sum(b * b for b in vec2))
    
    if mag1 == 0 or mag2 == 0:
        return 0.0
    
    return dot_product / (mag1 * mag2)


def vector_search(
    db: Session,
    query: str,
    tenant_id: UUID,
    top_k: int = 5,
    similarity_threshold: float = 0.7,
) -> List[Tuple[str, float, str]]:
    """
    Search for similar document chunks using vector similarity.
    Returns list of (content, similarity_score, document_title).
    """
    query_embedding = generate_embedding(query)

    sql = text("""
        SELECT
            e.id,
            e.embedding,
            dc.content,
            d.title as document_title
        FROM embeddings e
        JOIN document_chunks dc ON dc.id = e.chunk_id
        JOIN documents d ON d.id = dc.document_id
        WHERE e.tenant_id = :tenant_id
        ORDER BY e.created_at DESC
        LIMIT 100
    """)

    results = db.execute(
        sql,
        {
            "tenant_id": str(tenant_id),
        },
    ).fetchall()

    # Calculate similarity scores in Python
    scored_results = []
    for row in results:
        embedding_id, embedding_str, content, doc_title = row
        try:
            embedding = json.loads(embedding_str)
            similarity = cosine_similarity(query_embedding, embedding)
            if similarity >= similarity_threshold:
                scored_results.append((content, similarity, doc_title, embedding_id))
        except (json.JSONDecodeError, ValueError):
            # Skip invalid embeddings
            continue

    # Sort by similarity and return top_k
    scored_results.sort(key=lambda x: x[1], reverse=True)
    return [(content, score, title) for content, score, title, _ in scored_results[:top_k]]


def keyword_search(
    db: Session,
    query: str,
    tenant_id: UUID,
    top_k: int = 5,
) -> List[Tuple[str, float, str]]:
    """
    Fallback full-text keyword search when vector similarity is too low.
    Uses ILIKE to find chunks containing any word from the query.
    """
    words = [w.strip() for w in query.split() if len(w.strip()) >= 4]  # min 4 chars to avoid noise
    if not words:
        return []

    conditions = " OR ".join(
        [f"(dc.content ILIKE :w{i} OR d.title ILIKE :w{i} OR regexp_replace(d.title, '[_\\-\\s]+', '', 'g') ILIKE :w{i})" for i in range(len(words))]
    )
    title_conditions = " OR ".join(
        [f"(d.title ILIKE :w{i} OR regexp_replace(d.title, '[_\\-\\s]+', '', 'g') ILIKE :w{i})" for i in range(len(words))]
    )
    params: dict = {"tenant_id": str(tenant_id)}
    for i, w in enumerate(words):
        params[f"w{i}"] = f"%{w}%"

    sql = text(f"""
        SELECT dc.content, d.title as document_title,
            CASE WHEN ({title_conditions}) THEN 1 ELSE 0 END as title_match
        FROM document_chunks dc
        JOIN documents d ON d.id = dc.document_id
        JOIN embeddings e ON e.chunk_id = dc.id
        WHERE e.tenant_id = :tenant_id
          AND ({conditions})
        ORDER BY title_match DESC
    """)

    rows = db.execute(sql, params).fetchall()
    return [(row[0], 0.5, row[1]) for row in rows[:top_k]]


def store_embedding(
    db: Session,
    chunk_id: UUID,
    tenant_id: UUID,
    embedding_vector: List[float],
) -> Embedding:
    """Store an embedding in the database."""
    embedding = Embedding(
        chunk_id=chunk_id,
        tenant_id=tenant_id,
        embedding=json.dumps(embedding_vector),  # Store as JSON string
    )
    db.add(embedding)
    db.commit()
    db.refresh(embedding)
    return embedding

