from pathlib import Path
import hashlib
import uuid
from sqlalchemy import select

from .models import FileAsset, User
from .storage import BASE_DIR

DEMO_EMAIL = "asha.verma@example.com"
DEMO_RESUME_NAME = "Asha_Verma_Resume.pdf"
DEMO_SOURCE = Path(__file__).resolve().parents[1] / "storage" / "demo" / DEMO_RESUME_NAME

def ensure_demo_resume(db):
    user = db.scalar(select(User).where(User.email == DEMO_EMAIL))
    if not user or not DEMO_SOURCE.exists():
        return None
    existing = db.scalar(select(FileAsset).where(FileAsset.user_id == user.id, FileAsset.original_name == DEMO_RESUME_NAME).order_by(FileAsset.created_at.desc()))
    if existing and (BASE_DIR / existing.stored_name).exists():
        return existing
    file_id = uuid.uuid4().hex
    stored_name = f"{file_id}.pdf"
    destination = BASE_DIR / stored_name
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Store the demo fixture using the same encryption-at-rest path as real uploads.
    from cryptography.fernet import Fernet
    import base64
    from .config import get_settings
    raw = get_settings().file_encryption_key
    key = raw.encode() if raw else base64.urlsafe_b64encode(hashlib.sha256(get_settings().jwt_secret.encode()).digest())
    data = DEMO_SOURCE.read_bytes()
    destination.write_bytes(Fernet(key).encrypt(data))
    asset = FileAsset(id=file_id,user_id=user.id,original_name=DEMO_RESUME_NAME,stored_name=stored_name,mime_type="application/pdf",size_bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
    db.add(asset)
    db.commit()
    return asset
