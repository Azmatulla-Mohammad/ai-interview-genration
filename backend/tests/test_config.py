import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


class SettingsNormalizationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_database_url = os.environ.get("DATABASE_URL")

    def tearDown(self) -> None:
        from app.core.config import get_settings

        if self.original_database_url is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = self.original_database_url

        get_settings.cache_clear()

    def test_render_postgresql_url_is_normalized_for_sqlalchemy(self) -> None:
        os.environ["DATABASE_URL"] = "postgresql://render_user:secret@render.example.com:5432/app"

        from app.core.config import get_settings

        get_settings.cache_clear()

        self.assertEqual(
            get_settings().database_url,
            "postgresql+psycopg://render_user:secret@render.example.com:5432/app",
        )

    def test_legacy_postgres_scheme_is_normalized_for_sqlalchemy(self) -> None:
        os.environ["DATABASE_URL"] = "postgres://render_user:secret@render.example.com:5432/app"

        from app.core.config import get_settings

        get_settings.cache_clear()

        self.assertEqual(
            get_settings().database_url,
            "postgresql+psycopg://render_user:secret@render.example.com:5432/app",
        )


if __name__ == "__main__":
    unittest.main()
