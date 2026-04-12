import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from app.api.routes.auth import router as auth_router
from app.api.routes.interviews import router as interview_router
from app.core.config import get_settings, get_settings_status
from app.core.database import (
    DatabaseUnavailableError,
    get_database_status,
    initialize_database,
    mark_database_unavailable,
    summarize_database_exception,
)
from app.services.ai_service import get_ai_service_status


logger = logging.getLogger(__name__)
FAVICON_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
    '<rect width="64" height="64" rx="12" fill="#101828"/>'
    '<path d="M18 42V22h6v20h-6Zm11 0 8-20h6l8 20h-7l-1.2-3.6h-8.2L33.4 42H29Zm7.2-8.8h4.9L38.7 26l-2.5 7.2Z" fill="#7dd3fc"/>'
    "</svg>"
)


def _build_health_payload() -> dict:
    database = get_database_status()
    configuration = get_settings_status()
    ai = get_ai_service_status()
    overall_status = "healthy" if database["available"] and database["mode"] == "configured" else "degraded"

    return {
        "status": overall_status,
        "database": database,
        "configuration": configuration,
        "ai": ai,
    }


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        initialize_database()
        health = _build_health_payload()
        if health["status"] == "healthy":
            logger.info("Application startup completed with the configured database.")
        else:
            logger.warning(
                "Application startup completed in degraded mode. Database state: %s",
                health["database"]["message"],
            )
        yield

    app = FastAPI(title=settings.app_name, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            settings.frontend_url,
            "http://127.0.0.1:5173",
            "http://localhost:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    def read_root() -> dict:
        health = _build_health_payload()
        return {
            "name": settings.app_name,
            "environment": settings.app_env,
            "status": health["status"],
        }

    @app.get("/favicon.ico", include_in_schema=False)
    def favicon_ico() -> Response:
        return Response(content=FAVICON_SVG, media_type="image/svg+xml")

    @app.get("/favicon.svg", include_in_schema=False)
    def favicon_svg() -> Response:
        return Response(content=FAVICON_SVG, media_type="image/svg+xml")

    @app.get("/health")
    def health_check() -> dict:
        return _build_health_payload()

    @app.get("/ready")
    def readiness_check(response: Response) -> dict:
        database = get_database_status()
        if not database["available"]:
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "ready" if database["available"] else "not_ready",
            "database": database,
        }

    @app.exception_handler(DatabaseUnavailableError)
    def handle_database_unavailable(_: Request, exc: DatabaseUnavailableError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "detail": str(exc) or "Database is currently unavailable.",
                "database": get_database_status(),
            },
        )

    @app.exception_handler(OperationalError)
    def handle_database_operational_error(_: Request, exc: OperationalError) -> JSONResponse:
        mark_database_unavailable(exc)
        logger.warning("Database request failed: %s", summarize_database_exception(exc))
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "detail": "Database request failed.",
                "database": get_database_status(),
            },
        )

    app.include_router(auth_router, prefix=settings.api_prefix)
    app.include_router(interview_router, prefix=settings.api_prefix)

    return app


app = create_app()
