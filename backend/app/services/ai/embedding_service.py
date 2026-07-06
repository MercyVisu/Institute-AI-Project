from app.services.ai.client import get_ai_client
from app.core.config import get_settings
from typing import List
import tiktoken


def generate_embedding(text: str) -> List[float]:
    """Generate embedding for a text."""
    model = get_settings().EMBEDDING_MODEL
    response = get_ai_client().embeddings.create(input=text, model=model)
    return response.data[0].embedding


def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for multiple texts."""
    model = get_settings().EMBEDDING_MODEL
    response = get_ai_client().embeddings.create(input=texts, model=model)
    return [item.embedding for item in response.data]


def count_tokens(text: str, model: str = "gpt-3.5-turbo") -> int:
    """Count tokens in text."""
    try:
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))
    except Exception:
        return len(text) // 4
