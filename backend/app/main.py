from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.interviews import router as interview_router
from app.core.config import get_settings
from app.core.database import create_db_and_tables


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        create_db_and_tables()
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
        return {
            "name": settings.app_name,
            "environment": settings.app_env,
            "status": "ok",
        }

    @app.get("/health")
    def health_check() -> dict:
        return {"status": "healthy"}

    app.include_router(auth_router, prefix=settings.api_prefix)
    app.include_router(interview_router, prefix=settings.api_prefix)

    return app


app = create_app()
