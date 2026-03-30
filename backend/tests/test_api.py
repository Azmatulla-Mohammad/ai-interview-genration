import os
import sys
import tempfile
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


class StubAIService:
    def generate_questions(self, job_role: str, difficulty: str, count: int) -> list[str]:
        return [
            f"{job_role} question {index + 1} at {difficulty} level"
            for index in range(count)
        ]

    def evaluate_answer(self, question_text: str, user_answer: str) -> dict:
        return {
            "score": 8,
            "feedback": f"Strong answer for: {question_text}",
            "missing_points": "Mention one more production example.",
            "ideal_answer": f"Ideal answer for {question_text}",
        }


class ApiFlowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.db_path = Path(cls.temp_dir.name) / "test.db"

        os.environ["DATABASE_URL"] = f"sqlite:///{cls.db_path.as_posix()}"
        os.environ["GEMINI_API_KEY"] = ""
        os.environ["JWT_SECRET_KEY"] = "test-secret-key"

        from app.core.config import get_settings
        from app.core.database import reset_database_state

        get_settings.cache_clear()
        reset_database_state()

        from app.api.routes.interviews import get_ai_service
        from app.main import create_app
        from fastapi.testclient import TestClient

        cls.app = create_app()
        cls.app.dependency_overrides[get_ai_service] = lambda: StubAIService()
        cls.client = TestClient(cls.app)
        cls.client.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        from app.core.database import reset_database_state

        cls.client.__exit__(None, None, None)
        reset_database_state()
        cls.temp_dir.cleanup()

    def test_full_interview_flow(self) -> None:
        register_response = self.client.post(
            "/api/auth/register",
            json={
                "name": "Azmat User",
                "email": "azmat@example.com",
                "password": "password123",
            },
        )
        self.assertEqual(register_response.status_code, 201)

        duplicate_response = self.client.post(
            "/api/auth/register",
            json={
                "name": "Azmat User",
                "email": "azmat@example.com",
                "password": "password123",
            },
        )
        self.assertEqual(duplicate_response.status_code, 400)

        login_response = self.client.post(
            "/api/auth/login",
            json={
                "email": "azmat@example.com",
                "password": "password123",
            },
        )
        self.assertEqual(login_response.status_code, 200)
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        me_response = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response.json()["email"], "azmat@example.com")

        questions_response = self.client.post(
            "/api/questions/generate",
            json={
                "job_role": "Python Developer",
                "difficulty": "Medium",
                "question_count": 7,
            },
            headers=headers,
        )
        self.assertEqual(questions_response.status_code, 201)
        questions = questions_response.json()
        self.assertEqual(len(questions), 7)
        self.assertTrue(all(item["batch_id"] == questions[0]["batch_id"] for item in questions))

        list_response = self.client.get(
            "/api/questions",
            params={"batch_id": questions[0]["batch_id"], "page": 1, "page_size": 7},
            headers=headers,
        )
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.json()["total"], 7)

        evaluation_response = self.client.post(
            "/api/evaluations",
            json={
                "question_id": questions[0]["id"],
                "user_answer": "I would define the concept, explain the tradeoffs, and give a production example.",
            },
            headers=headers,
        )
        self.assertEqual(evaluation_response.status_code, 201)
        evaluation = evaluation_response.json()
        self.assertEqual(evaluation["score"], 8)
        self.assertEqual(evaluation["batch_id"], questions[0]["batch_id"])

        history_response = self.client.get(
            "/api/history",
            params={"job_role": "Python Developer", "difficulty": "Medium"},
            headers=headers,
        )
        self.assertEqual(history_response.status_code, 200)
        history = history_response.json()
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["score"], 8)

        analytics_response = self.client.get("/api/analytics", headers=headers)
        self.assertEqual(analytics_response.status_code, 200)
        analytics = analytics_response.json()
        self.assertEqual(analytics["total_attempts"], 1)
        self.assertEqual(analytics["top_score"], 8)


if __name__ == "__main__":
    unittest.main()
