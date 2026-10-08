from pathlib import Path
import base64
import hashlib
import os
import uuid

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException, UploadFile

from .config import get_settings

BASE_DIR = Path(os.getenv("FILE_STORAGE_DIR", "backend/storage/files"))
BASE_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}
MAX_BYTES = 5 * 1024 * 1024

def _fernet() -> Fernet:
    raw = get_settings().file_encryption_key
    if raw:
        key = raw.encode()
    else:
        key = base64.urlsafe_b64encode(hashlib.sha256(get_settings().jwt_secret.encode()).digest())
    return Fernet(key)

async def save_resume(upload: UploadFile) -> tuple[str, str, int, str]:
    suffix = Path(upload.filename or "").suffix.lower()
    mime = (upload.content_type or "").lower()
    if mime not in ALLOWED or suffix != ALLOWED[mime]:
        raise HTTPException(415, "Resume must be a PDF, DOC, or DOCX file")
    data = await upload.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Resume must be 5 MB or smaller")
    if not data:
        raise HTTPException(400, "The uploaded resume is empty")
    if mime == "application/pdf" and not data.startswith(b"%PDF"):
        raise HTTPException(415, "The uploaded PDF is not valid")
    if mime in {"application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"} and not (data.startswith(b"PK") or data.startswith(b"\xd0\xcf\x11\xe0")):
        raise HTTPException(415, "The uploaded document is not valid")
    file_id = uuid.uuid4().hex
    stored_name = f"{file_id}{suffix}"
    (BASE_DIR / stored_name).write_bytes(_fernet().encrypt(data))
    return file_id, stored_name, len(data), hashlib.sha256(data).hexdigest()

def file_path(stored_name: str) -> Path:
    path = (BASE_DIR / stored_name).resolve()
    if BASE_DIR.resolve() not in path.parents:
        raise ValueError("Invalid file path")
    return path

def read_resume(stored_name: str) -> bytes:
    path = file_path(stored_name)
    try:
        return _fernet().decrypt(path.read_bytes())
    except (InvalidToken, OSError) as exc:
        raise HTTPException(500, "Stored resume could not be opened") from exc
