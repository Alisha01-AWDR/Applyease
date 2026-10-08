from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator

PROJECT_ROOT = Path(__file__).resolve().parents[2]

class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://applyease:applyease@localhost:5432/applyease"
    jwt_secret: str = "dev-only-change-me"
    access_token_minutes: int = 30
    refresh_token_days: int = 14
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-5-5"
    anthropic_base_url: str = "https://api.anthropic.com"
    disclosure_encryption_key: str | None = None
    file_encryption_key: str | None = None
    cors_origins: str = "http://localhost:5173"
    demo_email: str = "asha.verma@example.com"
    demo_password: str = "ApplyEase123!"
    test_reset_token: str | None = None
    app_env: str = "development"
    approved_job_hosts: str = ""
    model_config = SettingsConfigDict(
        env_file=(PROJECT_ROOT / ".env", PROJECT_ROOT / "backend" / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_production(self):
        if self.app_env == "production":
            if self.jwt_secret in {"dev-only-change-me", "local-only-change-me"} or len(self.jwt_secret) < 32:
                raise ValueError("JWT_SECRET must be a strong 32+ character production secret")
            if not self.cors_list:
                raise ValueError("CORS_ORIGINS must be configured in production")
            if not self.disclosure_encryption_key:
                raise ValueError("DISCLOSURE_ENCRYPTION_KEY is required in production")
            if not self.file_encryption_key:
                raise ValueError("FILE_ENCRYPTION_KEY is required in production")
        return self

    @property
    def cors_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

    @property
    def approved_job_host_list(self) -> list[str]:
        return [x.strip().lower() for x in self.approved_job_hosts.split(",") if x.strip()]

@lru_cache
def get_settings() -> Settings:
    return Settings()
