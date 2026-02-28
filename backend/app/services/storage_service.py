from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.config import settings


async def save_upload_file(file: UploadFile) -> str:
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    extension = Path(file.filename or "").suffix or ".jpg"
    filename = f"{uuid4().hex}{extension}"
    filepath = upload_dir / filename

    file_bytes = await file.read()
    filepath.write_bytes(file_bytes)

    return f"{settings.static_base_url}/uploads/{filename}"
