import logging
import re
from collections.abc import Generator
from dataclasses import dataclass
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import BACKEND_DIR, get_settings


logger = logging.getLogger(__name__)
_LOCAL_SQLITE_FALLBACK_PATH = BACKEND_DIR / "ai_interview_bot.dev.db"
_LOCAL_SQLITE_FALLBACK_URL = f"sqlite:///{_LOCAL_SQLITE_FALLBACK_PATH.as_posix()}"
_active_database_url: str | None = None


@dataclass
class DatabaseState:
    initialized: bool = False
    available: bool = False
    mode: str = "pending"
    message: str = "Database initialization has not run yet."
    active_url: str | None = None


class DatabaseUnavailableError(RuntimeError):
    pass


_database_state = DatabaseState()


class Base(DeclarativeBase):
    pass


def _engine_kwargs(database_url: str) -> dict:
    kwargs: dict = {"pool_pre_ping": True}
    if database_url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    return kwargs


def _current_database_url() -> str:
    return _active_database_url or get_settings().database_url


def _redact_database_url(database_url: str) -> str:
    return re.sub(r"://([^:]+):([^@]+)@", r"://\1:***@", database_url)


def _should_fallback_to_sqlite(database_url: str) -> bool:
    settings = get_settings()
    return settings.app_env.lower() == "development" and not database_url.startswith("sqlite")


def _summarize_operational_error(exc: OperationalError) -> str:
    message = str(getattr(exc, "orig", exc)).splitlines()[0].strip()
    return message or exc.__class__.__name__


def summarize_database_exception(exc: Exception) -> str:
    if isinstance(exc, OperationalError):
        return _summarize_operational_error(exc)
    message = str(exc).splitlines()[0].strip()
    return message or exc.__class__.__name__


def _set_database_state(
    *,
    initialized: bool,
    available: bool,
    mode: str,
    message: str,
    active_url: str | None,
) -> None:
    global _database_state

    _database_state = DatabaseState(
        initialized=initialized,
        available=available,
        mode=mode,
        message=message,
        active_url=active_url,
    )


def _successful_database_mode(database_url: str) -> str:
    configured_url = get_settings().database_url
    if database_url == _LOCAL_SQLITE_FALLBACK_URL and configured_url != _LOCAL_SQLITE_FALLBACK_URL:
        return "sqlite-fallback"
    return "configured"


def _clear_database_caches() -> None:
    if get_engine.cache_info().currsize:
        get_engine().dispose()
    get_engine.cache_clear()
    get_session_factory.cache_clear()


def _activate_database_url(database_url: str) -> None:
    global _active_database_url

    if _active_database_url == database_url:
        return

    _clear_database_caches()
    _active_database_url = database_url


@lru_cache
def get_engine():
    database_url = _current_database_url()
    return create_engine(database_url, **_engine_kwargs(database_url))


@lru_cache
def get_session_factory():
    return sessionmaker(
        bind=get_engine(),
        autoflush=False,
        autocommit=False,
        class_=Session,
    )


def get_db() -> Generator[Session, None, None]:
    ensure_database_available()
    db = get_session_factory()()
    try:
        yield db
    finally:
        db.close()


def create_db_and_tables() -> None:
    from app.models import answer, evaluation, question, user  # noqa: F401

    database_url = _current_database_url()

    try:
        Base.metadata.create_all(bind=get_engine())
    except OperationalError as exc:
        if not _should_fallback_to_sqlite(database_url):
            _set_database_state(
                initialized=True,
                available=False,
                mode="unavailable",
                message=summarize_database_exception(exc),
                active_url=None,
            )
            raise

        logger.warning(
            "Database startup failed for %s; falling back to local SQLite at %s. Original error: %s",
            _redact_database_url(database_url),
            _LOCAL_SQLITE_FALLBACK_PATH,
            _summarize_operational_error(exc),
        )
        _activate_database_url(_LOCAL_SQLITE_FALLBACK_URL)
        try:
            Base.metadata.create_all(bind=get_engine())
        except Exception as fallback_exc:
            _set_database_state(
                initialized=True,
                available=False,
                mode="unavailable",
                message=summarize_database_exception(fallback_exc),
                active_url=None,
            )
            raise

        _set_database_state(
            initialized=True,
            available=True,
            mode="sqlite-fallback",
            message=f"Using local SQLite fallback at {_LOCAL_SQLITE_FALLBACK_PATH}.",
            active_url=_LOCAL_SQLITE_FALLBACK_URL,
        )
        return
    except Exception as exc:
        _set_database_state(
            initialized=True,
            available=False,
            mode="unavailable",
            message=summarize_database_exception(exc),
            active_url=None,
        )
        raise

    _set_database_state(
        initialized=True,
        available=True,
        mode=_successful_database_mode(database_url),
        message="Database is ready.",
        active_url=database_url,
    )


def initialize_database() -> dict:
    try:
        create_db_and_tables()
    except OperationalError as exc:
        logger.warning(
            "Database initialization failed; the API will stay up in degraded mode. %s",
            summarize_database_exception(exc),
        )
    except Exception:
        logger.exception("Database initialization failed unexpectedly; the API will stay up in degraded mode.")

    return get_database_status()


def ensure_database_available() -> None:
    if not _database_state.initialized:
        initialize_database()

    if not _database_state.available:
        raise DatabaseUnavailableError(_database_state.message)


def mark_database_unavailable(exc: Exception) -> None:
    _set_database_state(
        initialized=True,
        available=False,
        mode="unavailable",
        message=summarize_database_exception(exc),
        active_url=_active_database_url,
    )


def get_database_status() -> dict:
    configured_url = get_settings().database_url
    active_url = _database_state.active_url or _active_database_url or configured_url

    return {
        "initialized": _database_state.initialized,
        "available": _database_state.available,
        "mode": _database_state.mode,
        "message": _database_state.message,
        "configured_url": _redact_database_url(configured_url),
        "active_url": _redact_database_url(active_url) if active_url else None,
        "fallback_path": str(_LOCAL_SQLITE_FALLBACK_PATH) if _database_state.mode == "sqlite-fallback" else None,
    }


def reset_database_state() -> None:
    global _active_database_url, _database_state

    _clear_database_caches()
    _active_database_url = None
    _database_state = DatabaseState()
