from app.core.config import get_settings
from app.services.ai.client import get_ai_client
import structlog
import os

logger = structlog.get_logger()

# Supported extensions by Whisper
_VALID_EXTS = {'.webm', '.ogg', '.oga', '.mp3', '.mp4', '.m4a', '.wav', '.flac', '.mpeg', '.mpga'}


def transcribe_audio(audio_bytes: bytes, filename: str = "recording.webm") -> str:
    """Transcribe audio — uses OpenAI Whisper (Ollama does not support audio)."""
    settings = get_settings()
    if settings.AI_PROVIDER == "ollama":
        raise ValueError("Voice transcription is not supported with Ollama. Switch AI_PROVIDER=openai for voice feature.")
    try:
        # Extract base extension, strip codec info (e.g. 'audio/webm;codecs=opus' -> '.webm')
        raw_ext = os.path.splitext(filename)[1].lower().split(";")[0]
        ext = raw_ext if raw_ext in _VALID_EXTS else ".webm"

        # Pass as explicit tuple (filename, bytes, content_type) — most reliable approach
        mime_map = {
            ".webm": "audio/webm",
            ".ogg": "audio/ogg",
            ".oga": "audio/ogg",
            ".mp3": "audio/mpeg",
            ".mp4": "audio/mp4",
            ".m4a": "audio/mp4",
            ".wav": "audio/wav",
            ".flac": "audio/flac",
            ".mpeg": "audio/mpeg",
            ".mpga": "audio/mpeg",
        }
        content_type = mime_map.get(ext, "audio/wav")
        transcript = get_ai_client().audio.transcriptions.create(
            model="whisper-1",
            file=(f"recording{ext}", audio_bytes, content_type),
        )

        text = transcript.text.strip()
        if not text:
            raise ValueError("No speech detected. Please speak clearly and try again.")
        return text
    except ValueError:
        raise
    except Exception as e:
        logger.error("whisper_transcription_failed", error=str(e))
        raise ValueError(f"Audio transcription failed: {str(e)}")
