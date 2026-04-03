import logging
from functools import lru_cache
from pathlib import Path

from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"
DEFAULT_JWT_SECRET_KEY = "change-this-to-a-long-random-secret"
logger = logging.getLogger(__name__)
_settings_load_error: str | None = None


class Settings(BaseSettings):
    app_name: str = "AI Interview Coach"
    app_env: str = "development"
    api_prefix: str = "/api"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/ai_interview_bot"
    frontend_url: str = "http://localhost:5173"
    jwt_secret_key: str = DEFAULT_JWT_SECRET_KEY
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash-lite"
    question_batch_size: int = 5

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


def _summarize_validation_error(exc: ValidationError) -> str:
    messages = []
    for error in exc.errors():
        loc = ".".join(str(part) for part in error.get("loc", ()))
        detail = error.get("msg", "Invalid value")
        messages.append(f"{loc}: {detail}" if loc else detail)
    return "; ".join(messages) or str(exc)


@lru_cache
def get_settings() -> Settings:
    global _settings_load_error

    try:
        settings = Settings()
    except ValidationError as exc:
        _settings_load_error = _summarize_validation_error(exc)
        logger.warning(
            "Settings validation failed for %s; starting with safe defaults. %s",
            ENV_FILE,
            _settings_load_error,
        )
        settings = Settings.model_validate({})
    else:
        _settings_load_error = None

    return settings


def get_settings_status() -> dict:
    settings = get_settings()
    warnings: list[str] = []

    if _settings_load_error:
        warnings.append(f"Invalid config values were ignored: {_settings_load_error}")
    if settings.jwt_secret_key == DEFAULT_JWT_SECRET_KEY:
        warnings.append("JWT secret key is still using the development default.")
    if not settings.gemini_api_key:
        warnings.append("Gemini API key is missing; AI routes will use local fallbacks.")

    return {
        "environment": settings.app_env,
        "env_file": str(ENV_FILE),
        "load_error": _settings_load_error,
        "warnings": warnings,
    }
