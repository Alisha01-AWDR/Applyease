from pydantic import BaseModel, EmailStr, Field
from typing import Any, Literal

class AuthRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=200)
    name: str | None = Field(default=None, max_length=200)

class RefreshRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict

class ProfileIn(BaseModel):
    data: dict[str, Any]

class DraftIn(BaseModel):
    step: int = Field(default=1, ge=1, le=100)
    answers: dict[str, str]

class AnalyzeIn(BaseModel):
    text: str = Field(min_length=20, max_length=30000)

class ConfirmIn(BaseModel):
    acknowledge: bool
    confirmation_method: Literal["keyboard", "voice"] = "keyboard"

class SubmitIn(BaseModel):
    confirmation_token: str | None = None

class DisclosureIn(BaseModel):
    enabled: bool = False
    payload: dict[str, Any] = {}
    shared_with_employer: bool = False
