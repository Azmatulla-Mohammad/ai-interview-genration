import json
import logging
import re
from collections.abc import Iterable
from functools import lru_cache

from app.core.config import Settings, get_settings


logger = logging.getLogger(__name__)

try:
    from google import genai
except ImportError:  # pragma: no cover
    genai = None


class AIService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.client = None
        if self.settings.gemini_api_key and genai is not None:
            try:
                self.client = genai.Client(api_key=self.settings.gemini_api_key)
            except Exception as exc:
                logger.warning("Gemini client setup failed; using local fallbacks: %s", exc)

    def generate_questions(self, job_role: str, difficulty: str, count: int) -> list[str]:
        prompt = f"""
You are an interview coach.
Generate exactly {count} interview questions for the job role "{job_role}" at "{difficulty}" difficulty.
Return a JSON array of strings only.
Do not include markdown, titles, explanations, or numbering outside the JSON array.
""".strip()

        if self.client is not None:
            try:
                response = self.client.models.generate_content(
                    model=self.settings.gemini_model,
                    contents=prompt,
                )
                parsed = self._load_json_array(getattr(response, "text", "") or "")
                if parsed:
                    return parsed[:count]
            except Exception as exc:
                logger.warning("Gemini question generation failed; falling back to local prompts: %s", exc)

        return self._fallback_questions(job_role, difficulty, count)

    def evaluate_answer(self, question_text: str, user_answer: str) -> dict:
        prompt = f"""
You are a supportive interview evaluator.
Review the question and answer below.

Question:
{question_text}

Answer:
{user_answer}

Return valid JSON only with this exact shape:
{{
  "score": 0-10 integer,
  "feedback": "short detailed feedback",
  "missing_points": "key points the candidate missed",
  "ideal_answer": "a strong sample answer"
}}

Be fair, practical, and concise.
""".strip()

        if self.client is not None:
            try:
                response = self.client.models.generate_content(
                    model=self.settings.gemini_model,
                    contents=prompt,
                )
                parsed = self._load_json_object(getattr(response, "text", "") or "")
                if parsed:
                    return self._normalize_evaluation(parsed)
            except Exception as exc:
                logger.warning("Gemini evaluation failed; using fallback evaluation: %s", exc)

        return self._fallback_evaluation(question_text, user_answer)

    def _load_json_array(self, raw_text: str) -> list[str]:
        cleaned = self._extract_json_blob(raw_text)
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            return []

        if not isinstance(data, list):
            return []

        questions = []
        for item in data:
            if isinstance(item, str) and item.strip():
                questions.append(self._strip_question_number(item.strip()))
        if questions:
            return questions

        return self._parse_question_lines(raw_text)

    def _parse_question_lines(self, raw_text: str) -> list[str]:
        questions = []
        for line in raw_text.splitlines():
            cleaned = self._strip_question_number(line.strip(" -*\t"))
            if cleaned and len(cleaned) > 5:
                questions.append(cleaned)
        return questions

    def _load_json_object(self, raw_text: str) -> dict:
        cleaned = self._extract_json_blob(raw_text)
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            return {}
        return data if isinstance(data, dict) else {}

    def _extract_json_blob(self, raw_text: str) -> str:
        raw_text = raw_text.strip()
        raw_text = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.IGNORECASE | re.DOTALL).strip()
        if raw_text.startswith("[") or raw_text.startswith("{"):
            return raw_text

        first_object = raw_text.find("{")
        last_object = raw_text.rfind("}")
        if first_object != -1 and last_object > first_object:
            return raw_text[first_object : last_object + 1]

        first_array = raw_text.find("[")
        last_array = raw_text.rfind("]")
        if first_array != -1 and last_array > first_array:
            return raw_text[first_array : last_array + 1]

        return raw_text

    def _normalize_evaluation(self, data: dict) -> dict:
        missing_points = data.get("missing_points", data.get("missingPoints", "No missing points identified."))
        ideal_answer = data.get("ideal_answer", data.get("idealAnswer", "No ideal answer generated."))
        feedback = data.get("feedback", "No feedback available.")
        try:
            score = int(data.get("score", 0))
        except (TypeError, ValueError):
            score = 0
        score = max(0, min(10, score))
        return {
            "score": score,
            "feedback": str(feedback).strip(),
            "missing_points": str(missing_points).strip(),
            "ideal_answer": str(ideal_answer).strip(),
        }

    def _strip_question_number(self, text: str) -> str:
        return re.sub(r"^\s*\d+[\).\-\:]*\s*", "", text).strip()

    def _fallback_questions(self, job_role: str, difficulty: str, count: int) -> list[str]:
        difficulty_hint = {
            "Easy": "basic understanding and beginner-friendly concepts",
            "Medium": "practical work situations and design tradeoffs",
            "Hard": "advanced edge cases, scaling, and architecture decisions",
        }.get(difficulty.title(), "real interview situations")

        templates: Iterable[str] = (
            f"Walk me through your experience as a {job_role} and the projects that best prepared you for this role.",
            f"What core skills should a strong {job_role} demonstrate when solving {difficulty_hint} problems?",
            f"How would you approach debugging a production issue as a {job_role}?",
            f"Describe a time you had to balance speed, quality, and maintainability in a {job_role} task.",
            f"What tools, frameworks, or practices do you rely on most as a {job_role}, and why?",
            f"How would you explain a complex {job_role} concept to a non-technical stakeholder?",
            f"What common mistakes do candidates make in {job_role} interviews, especially at {difficulty} level?",
            f"How would you design a small but scalable solution for a typical {job_role} assignment?",
        )
        return list(templates)[:count]

    def _fallback_evaluation(self, question_text: str, user_answer: str) -> dict:
        answer = user_answer.strip()
        word_count = len(answer.split())
        question_terms = {
            token.lower()
            for token in re.findall(r"[A-Za-z]{4,}", question_text)
        }
        answer_terms = {
            token.lower()
            for token in re.findall(r"[A-Za-z]{4,}", answer)
        }
        overlap = len(question_terms & answer_terms)

        score = 2
        if word_count >= 15:
            score += 2
        if word_count >= 35:
            score += 2
        if overlap >= 2:
            score += 2
        if overlap >= 5:
            score += 2
        score = max(1, min(10, score))

        return {
            "score": score,
            "feedback": "Your answer addresses the topic and gives the interviewer something to work with. Add clearer structure, practical examples, and stronger reasoning to improve it.",
            "missing_points": "Include a direct definition, explain your approach step by step, mention tradeoffs, and support your answer with a short real example.",
            "ideal_answer": f"A strong answer would define the concept, relate it to {question_text.lower()}, describe a practical example, and explain why that approach works best.",
        }


@lru_cache
def get_ai_service() -> AIService:
    return AIService()


def get_ai_service_status() -> dict:
    settings = get_settings()

    if not settings.gemini_api_key:
        return {
            "available": True,
            "mode": "local-fallback",
            "message": "Gemini API key is not configured; local question and evaluation fallbacks are active.",
        }
    if genai is None:
        return {
            "available": True,
            "mode": "local-fallback",
            "message": "google-genai is not installed; local question and evaluation fallbacks are active.",
        }

    return {
        "available": True,
        "mode": "gemini",
        "message": "Gemini is configured. If remote requests fail, the app will still use local fallbacks.",
    }
