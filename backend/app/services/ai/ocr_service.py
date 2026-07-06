import base64
import structlog
from app.core.config import get_settings
from app.services.ai.client import get_ai_client

logger = structlog.get_logger()


def extract_text_from_image(image_bytes: bytes) -> str:
    """Analyze image using Vision model and return description/extracted text."""
    settings = get_settings()
    # Inform user if running offline without llava downloaded
    if settings.AI_PROVIDER == "ollama" and settings.VISION_MODEL == "llava":
        raise ValueError(
            "Image analysis is not available in offline mode. "
            "Please type your question instead."
        )
    try:
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        response = get_ai_client().chat.completions.create(
            model=get_settings().VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Please analyze this image. "
                                "If it contains text, extract and return all the text. "
                                "If it is a question or diagram, describe what you see and answer any question shown. "
                                "Be concise and helpful."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                        },
                    ],
                }
            ],
            max_tokens=1000,
        )
        result = response.choices[0].message.content or ""
        return result.strip()
    except Exception as e:
        err_str = str(e)
        logger.error("ocr_extraction_failed", error=err_str)
        # Friendly message when vision model is not downloaded
        if "not found" in err_str or "404" in err_str or "not_found_error" in err_str:
            raise ValueError(
                "Image analysis is not available in offline mode. "
                "Please type your question instead."
            )
        raise ValueError(f"Image analysis failed. Please try again.")
