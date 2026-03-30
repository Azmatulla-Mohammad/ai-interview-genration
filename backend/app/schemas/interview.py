from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GenerateQuestionsRequest(BaseModel):
    job_role: str = Field(min_length=2, max_length=120)
    difficulty: str = Field(min_length=3, max_length=30)
    question_count: int = Field(default=5, ge=1, le=20)


class QuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    batch_id: str
    job_role: str
    difficulty: str
    question_text: str
    created_at: datetime


class PaginatedQuestionResponse(BaseModel):
    items: list[QuestionResponse]
    page: int
    page_size: int
    total: int
    total_pages: int


class SubmitAnswerRequest(BaseModel):
    question_id: int
    user_answer: str = Field(min_length=5)


class EvaluationResultResponse(BaseModel):
    evaluation_id: int
    answer_id: int
    question_id: int
    batch_id: str
    question_text: str
    user_answer: str
    score: int
    feedback: str
    missing_points: str
    ideal_answer: str
    created_at: datetime


class HistoryItemResponse(BaseModel):
    evaluation_id: int
    question_id: int
    job_role: str
    difficulty: str
    question_text: str
    user_answer: str
    score: int
    feedback: str
    missing_points: str
    ideal_answer: str
    answered_at: datetime


class DifficultyBreakdownItem(BaseModel):
    difficulty: str
    average_score: float


class TimelinePoint(BaseModel):
    attempt: int
    score: int


class AnalyticsResponse(BaseModel):
    total_attempts: int
    average_score: float
    top_score: int
    lowest_score: int
    difficulty_breakdown: list[DifficultyBreakdownItem]
    timeline: list[TimelinePoint]
