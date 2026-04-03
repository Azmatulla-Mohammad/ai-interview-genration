import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from sqlalchemy.exc import OperationalError


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


class StartupResilienceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_app_env = os.environ.get("APP_ENV")
        self.original_database_url = os.environ.get("DATABASE_URL")
        self.original_jwt_secret_key = os.environ.get("JWT_SECRET_KEY")

    def tearDown(self) -> None:
        from app.core.config import get_settings
        from app.core.database import reset_database_state
        from app.services.ai_service import get_ai_service

        if self.original_app_env is None:
            os.environ.pop("APP_ENV", None)
        else:
            os.environ["APP_ENV"] = self.original_app_env

        if self.original_database_url is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = self.original_database_url

        if self.original_jwt_secret_key is None:
            os.environ.pop("JWT_SECRET_KEY", None)
        else:
            os.environ["JWT_SECRET_KEY"] = self.original_jwt_secret_key

        get_settings.cache_clear()
        get_ai_service.cache_clear()
        reset_database_state()

    def test_app_starts_and_returns_503s_when_database_is_unavailable(self) -> None:
        os.environ["APP_ENV"] = "production"
        os.environ["DATABASE_URL"] = "postgresql+psycopg://invalid:invalid@example.com/app"
        os.environ["JWT_SECRET_KEY"] = "test-secret-key"

        from app.core.config import get_settings
        from app.core import database
        from app.main import create_app
        from fastapi.testclient import TestClient

        get_settings.cache_clear()
        database.reset_database_state()

        with patch.object(
            database.Base.metadata,
            "create_all",
            side_effect=OperationalError("CREATE TABLE", {}, RuntimeError("password authentication failed")),
        ):
            with TestClient(create_app()) as client:
                health_response = client.get("/health")
                self.assertEqual(health_response.status_code, 200)
                health = health_response.json()
                self.assertEqual(health["status"], "degraded")
                self.assertFalse(health["database"]["available"])
                self.assertEqual(health["database"]["mode"], "unavailable")

                ready_response = client.get("/ready")
                self.assertEqual(ready_response.status_code, 503)
                self.assertEqual(ready_response.json()["status"], "not_ready")

                register_response = client.post(
                    "/api/auth/register",
                    json={
                        "name": "Azmat User",
                        "email": "azmat@example.com",
                        "password": "password123",
                    },
                )
                self.assertEqual(register_response.status_code, 503)


if __name__ == "__main__":
    unittest.main()
