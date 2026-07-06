from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.services.ai.client import get_ai_client
from app.services.ai.vector_service import vector_search, keyword_search
from typing import Optional, List, Tuple
from uuid import UUID
from openai import OpenAI

SYSTEM_PROMPT = """You are a helpful school assistant. Answer ONLY using the given context documents. 
If the context does not contain relevant information about the question, respond EXACTLY with: "I don't have information about that. Please contact the institution directly for assistance."
Do NOT make up, guess, or infer information not in the context. Be brief and direct."""


def generate_rag_response(
    db: Session,
    query: str,
    tenant_id: UUID,
    tone: str = "professional",
    custom_instructions: Optional[str] = None,
    chat_history: Optional[List[dict]] = None,
    ai_client: Optional[OpenAI] = None,
    chat_model: Optional[str] = None,
) -> Tuple[str, List[dict]]:
    """
    Generate a response using RAG pipeline.
    Returns (response_text, sources).
    """
    # 1. Vector search for relevant chunks (high threshold = only good matches)
    vector_results = vector_search(db, query, tenant_id, top_k=3, similarity_threshold=0.50)

    # 2. Keyword search only as fallback when vector found nothing, and only for real words (>=4 chars)
    search_results = vector_results
    if not search_results:
        keyword_results = keyword_search(db, query, tenant_id, top_k=3)
        search_results = keyword_results

    if not search_results:
        return (
            "I don't have information about that. Please contact the institution directly for assistance.",
            [],
        )

    # 2. Build context from retrieved chunks
    context_parts = []
    sources = []
    for content, score, doc_title in search_results:
        # Truncate each chunk to 400 chars to keep total context small (CPU speed)
        truncated = content[:400] if len(content) > 400 else content
        context_parts.append(f"[Source: {doc_title}]\n{truncated}")
        sources.append({"title": doc_title, "score": round(score, 3)})

    context = "\n\n---\n\n".join(context_parts)

    # 3. Build system prompt with tone
    tone_instructions = {
        "professional": "Respond in a professional and formal manner.",
        "friendly": "Respond in a warm, friendly, and approachable manner.",
        "academic": "Respond in an academic and scholarly manner with detailed explanations.",
    }
    tone_text = tone_instructions.get(tone, tone_instructions["professional"])

    system = f"{SYSTEM_PROMPT}\n\nTone: {tone_text}"
    if custom_instructions:
        system += f"\n\nAdditional Instructions: {custom_instructions}"

    # 4. Build messages
    messages = [{"role": "system", "content": system}]
    messages.append({
        "role": "system",
        "content": f"Context from institution documents:\n\n{context}",
    })

    if chat_history:
        for msg in chat_history[-2:]:  # Last 2 messages for context (CPU speed)
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": query})

    # 5. Generate response
    client = ai_client or get_ai_client()
    settings = get_settings()
    model = chat_model or settings.CHAT_MODEL

    # For Ollama (CPU), pass speed options: limit context window and threads
    extra_kwargs = {}
    if settings.AI_PROVIDER == "ollama":
        extra_kwargs["extra_body"] = {
            "options": {
                "num_ctx": 1024,      # small context window = faster
                "num_thread": 8,      # use all CPU cores
                "num_predict": 250,   # max output tokens
            }
        }

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.3,
        max_tokens=250,
        **extra_kwargs,
    )

    return response.choices[0].message.content, sources
