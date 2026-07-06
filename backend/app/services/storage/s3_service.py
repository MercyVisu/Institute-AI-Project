import boto3
from botocore.exceptions import ClientError
from app.core.config import get_settings
from fastapi import UploadFile
import uuid
import structlog
import os
from pathlib import Path

settings = get_settings()
logger = structlog.get_logger()


def get_s3_client():
    """Return a boto3 s3 client or None when credentials aren't configured."""
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY or not settings.AWS_BUCKET_NAME:
        return None
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )


async def upload_to_s3(file_or_bytes, folder: str = "documents", filename: str | None = None) -> tuple[str, int]:
    """Upload file (UploadFile or raw bytes) to S3 and return (URL, size_bytes).

    If AWS is not configured or an AWS error occurs the function falls back to
    saving the file under the backend `uploads/` directory and returns a
    backend-served URL: `{BACKEND_URL}/uploads/{key}`.
    """
    # Normalize input to bytes and metadata
    if isinstance(file_or_bytes, UploadFile):
        contents = await file_or_bytes.read()
        fname = file_or_bytes.filename
        content_type = file_or_bytes.content_type or "application/octet-stream"
    elif isinstance(file_or_bytes, (bytes, bytearray)):
        contents = bytes(file_or_bytes)
        fname = filename
        content_type = "application/octet-stream"
    else:
        raise TypeError("file_or_bytes must be UploadFile or bytes")

    file_ext = (fname.split(".")[-1] if fname else "bin")
    key = f"{folder}/{uuid.uuid4()}.{file_ext}"

    s3 = get_s3_client()
    if s3 is not None:
        try:
            s3.put_object(
                Bucket=settings.AWS_BUCKET_NAME,
                Key=key,
                Body=contents,
                ContentType=content_type,
            )
            url = f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
            return url, len(contents)
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            logger.error("s3_put_failed", error=str(e), code=code)
            # fall through to local fallback

    # Local fallback: save to backend/uploads/<key>
    try:
        backend_root = Path(__file__).resolve().parents[3]
        uploads_base = backend_root / "uploads"
        dest_path = uploads_base / key
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(dest_path, "wb") as f:
            f.write(contents)
        url = f"{settings.BACKEND_URL.rstrip('/')}/uploads/{key}"
        logger.info("local_upload_saved", path=str(dest_path))
        return url, len(contents)
    except Exception as e:
        logger.error("local_save_failed", error=str(e))
        raise ValueError(f"File upload failed: {str(e)}")


def delete_from_s3(file_url: str) -> bool:
    """Delete file from S3 or remove local fallback file.

    Returns True on success, False otherwise.
    """
    s3 = get_s3_client()
    try:
        # Attempt S3 delete when URL matches S3 pattern and client exists
        if s3 is not None and f"{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/" in file_url:
            key = file_url.split(f"{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/")[1]
            s3.delete_object(Bucket=settings.AWS_BUCKET_NAME, Key=key)
            return True

        # Otherwise try to delete local file saved under backend/uploads
        backend_root = Path(__file__).resolve().parents[3]
        uploads_base = backend_root / "uploads"
        prefix = f"{settings.BACKEND_URL.rstrip('/')}/uploads/"
        if file_url.startswith(prefix):
            rel = file_url[len(prefix):]
            path = uploads_base / rel
            if path.exists():
                path.unlink()
                return True

        logger.warning("delete_unknown_url", url=file_url)
        return False
    except Exception as e:
        logger.error("s3_delete_failed", error=str(e))
        return False


async def save_local_file(file_or_bytes, folder: str = "documents", filename: str | None = None) -> tuple[str, int, str]:
    """Save a file to the backend/uploads/<folder>/ and return (url, size_bytes, local_path).

    This helper always writes to local storage and is intended for development/testing.
    """
    # Normalize input to bytes and metadata
    if isinstance(file_or_bytes, UploadFile):
        contents = await file_or_bytes.read()
        fname = file_or_bytes.filename
        content_type = file_or_bytes.content_type or "application/octet-stream"
    elif isinstance(file_or_bytes, (bytes, bytearray)):
        contents = bytes(file_or_bytes)
        fname = filename
        content_type = "application/octet-stream"
    else:
        raise TypeError("file_or_bytes must be UploadFile or bytes")

    file_ext = (fname.split(".")[-1] if fname else "bin")
    key = f"{folder}/{uuid.uuid4()}.{file_ext}"

    try:
        backend_root = Path(__file__).resolve().parents[3]
        uploads_base = backend_root / "uploads"
        dest_path = uploads_base / key
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(dest_path, "wb") as f:
            f.write(contents)
        url = f"{settings.BACKEND_URL.rstrip('/')}/uploads/{key}"
        logger.info("local_upload_saved", path=str(dest_path))
        return url, len(contents), str(dest_path)
    except Exception as e:
        logger.error("local_save_failed", error=str(e))
        raise ValueError(f"File save failed: {str(e)}")
