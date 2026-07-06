from fastapi import APIRouter, Depends, UploadFile, File
from app.core.dependencies import require_tenant_access
from app.models.user import User
from app.services.storage.s3_service import upload_to_s3

router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_tenant_access),
):
    """Upload an image file."""
    allowed = {"png", "jpg", "jpeg", "gif", "webp"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else ""
    if ext not in allowed:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid image format")

    url, _ = await upload_to_s3(file, f"tenants/{current_user.tenant_id}/images")
    return {"url": url}


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(require_tenant_access),
):
    """Upload an avatar image."""
    url, _ = await upload_to_s3(file, f"tenants/{current_user.tenant_id}/avatars")
    return {"url": url}
