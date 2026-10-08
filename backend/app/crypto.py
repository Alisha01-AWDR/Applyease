import base64, hashlib
from cryptography.fernet import Fernet
from .config import get_settings

def _fernet() -> Fernet:
    raw = get_settings().disclosure_encryption_key
    if raw:
        key = raw.encode()
    else:
        key = base64.urlsafe_b64encode(hashlib.sha256(get_settings().jwt_secret.encode()).digest())
    return Fernet(key)

def encrypt_json(payload: dict) -> str:
    import json
    return _fernet().encrypt(json.dumps(payload, separators=(",", ":")).encode()).decode()

def decrypt_json(value: str) -> dict:
    import json
    return json.loads(_fernet().decrypt(value.encode()).decode())
