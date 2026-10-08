from datetime import datetime, timedelta, timezone
import hashlib
import secrets
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from .config import get_settings

ph = PasswordHasher()

def hash_password(password: str) -> str:
    return ph.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    try:
        return ph.verify(hashed, password)
    except VerifyMismatchError:
        return False

def _token(subject: str, token_type: str, expires: timedelta) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": subject, "type": token_type, "iat": now, "exp": now + expires}, get_settings().jwt_secret, algorithm="HS256")

def access_token(user_id: int) -> str:
    return _token(str(user_id), "access", timedelta(minutes=get_settings().access_token_minutes))

def refresh_token(user_id: int) -> str:
    return _token(str(user_id), "refresh", timedelta(days=get_settings().refresh_token_days))

def file_access_token(user_id: int, file_id: str, expires_minutes: int = 10) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": str(user_id), "file_id": file_id, "type": "file", "iat": now, "exp": now + timedelta(minutes=expires_minutes)}, get_settings().jwt_secret, algorithm="HS256")

def decode_file_access_token(token: str) -> tuple[int, str]:
    payload = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
    if payload.get("type") != "file" or not payload.get("file_id"):
        raise ValueError("Wrong token type")
    return int(payload["sub"]), str(payload["file_id"])

def decode_token(token: str, expected_type: str) -> int:
    payload = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
    if payload.get("type") != expected_type:
        raise ValueError("Wrong token type")
    return int(payload["sub"])

def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

def new_reference() -> str:
    now = datetime.now(timezone.utc)
    return f"AE-{now.year}-{secrets.token_hex(3).upper()}"
