import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from sqlalchemy.exc import OperationalError


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


class DatabaseFallbackTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_app_env = os.environ.get("APP_ENV")
        self.original_database_url = os.environ.get("DATABASE_URL")

    def tearDown(self) -> None:
        from app.core.config import get_settings
        from app.core.database import reset_database_state

        if self.original_app_env is None:
            os.environ.pop("APP_ENV", None)
        else:
            os.environ["APP_ENV"] = self.original_app_env

        if self.original_database_url is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = self.original_database_url

        get_settings.cache_clear()
        reset_database_state()

    def test_create_db_and_tables_falls_back_to_sqlite_in_development(self) -> None:
        os.environ["APP_ENV"] = "development"
        os.environ["DATABASE_URL"] = "postgresql+psycopg://invalid:invalid@example.com/app"

        from app.core.config import get_settings
        from app.core import database

        get_settings.cache_clear()
        database.reset_database_state()

        seen_dialects: list[str] = []

        def create_all_side_effect(*args, **kwargs):
            bind = kwargs["bind"]
            seen_dialects.append(bind.dialect.name)
            if bind.dialect.name != "sqlite":
                raise OperationalError("CREATE TABLE", {}, RuntimeError("password authentication failed"))
            return None

        with patch.object(database.Base.metadata, "create_all", side_effect=create_all_side_effect):
            database.create_db_and_tables()

        self.assertEqual(seen_dialects, ["postgresql", "sqlite"])
        self.assertEqual(database.get_engine().dialect.name, "sqlite")
        self.assertIn("ai_interview_bot.dev.db", str(database.get_engine().url))

    def test_create_db_and_tables_remains_strict_outside_development(self) -> None:
        os.environ["APP_ENV"] = "production"
        os.environ["DATABASE_URL"] = "postgresql+psycopg://invalid:invalid@example.com/app"

        from app.core.config import get_settings
        from app.core import database

        get_settings.cache_clear()
        database.reset_database_state()

        with patch.object(
            database.Base.metadata,
            "create_all",
            side_effect=OperationalError("CREATE TABLE", {}, RuntimeError("password authentication failed")),
        ):
            with self.assertRaises(OperationalError):
                database.create_db_and_tables()


if __name__ == "__main__":
    unittest.main()
