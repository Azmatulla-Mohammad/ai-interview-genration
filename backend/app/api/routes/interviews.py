from math import ceil
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.models.answer import Answer
from app.models.evaluation import Evaluation
from app.models.question import Question
from app.models.user import User
from app.schemas.interview import (
    AnalyticsResponse,
    DifficultyBreakdownItem,
    EvaluationResultResponse,
    GenerateQuestionsRequest,
    HistoryItemResponse,
    PaginatedQuestionResponse,
    QuestionResponse,
    SubmitAnswerRequest,
    TimelinePoint,
)
from app.services.ai_service import AIService, get_ai_service


router = APIRouter(tags=["interviews"])


@router.post(
    "/questions/generate",
    response_model=list[QuestionResponse],
    status_code=status.HTTP_201_CREATED,
)
def generate_questions(
    payload: GenerateQuestionsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    ai_service: AIService = Depends(get_ai_service),
) -> list[Question]:
    batch_id = uuid4().hex
    questions = [
        Question(
            user_id=current_user.id,
            batch_id=batch_id,
            job_role=payload.job_role.strip(),
            difficulty=payload.difficulty.strip().title(),
            question_text=question_text.strip(),
        )
        for question_text in ai_service.generate_questions(
            job_role=payload.job_role.strip(),
            difficulty=payload.difficulty.strip().title(),
            count=payload.question_count,
        )
        if question_text.strip()
    ]

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Questions could not be generated right now.",
        )

    db.add_all(questions)
    db.commit()
    for question in questions:
        db.refresh(question)

    return questions


@router.get("/questions", response_model=PaginatedQuestionResponse)
def list_questions(
    batch_id: str | None = Query(default=None),
    job_role: str | None = Query(default=None),
    difficulty: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=5, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedQuestionResponse:
    filters = [Question.user_id == current_user.id]
    if batch_id:
        filters.append(Question.batch_id == batch_id.strip())
    if job_role:
        filters.append(Question.job_role.ilike(job_role.strip()))
    if difficulty:
        filters.append(Question.difficulty.ilike(difficulty.strip()))

    total = db.scalar(select(func.count()).select_from(Question).where(*filters)) or 0
    total_pages = max(1, ceil(total / page_size)) if total else 1
    page = min(page, total_pages)
    offset = (page - 1) * page_size

    query = select(Question).where(*filters)
    if batch_id:
        query = query.order_by(Question.id.asc())
    else:
        query = query.order_by(Question.created_at.desc(), Question.id.desc())

    items = db.scalars(query.offset(offset).limit(page_size)).all()

    return PaginatedQuestionResponse(
        items=[QuestionResponse.model_validate(item, from_attributes=True) for item in items],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.get("/questions/{question_id}", response_model=QuestionResponse)
def get_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Question:
    question = db.scalar(
        select(Question).where(
            Question.id == question_id,
            Question.user_id == current_user.id,
        )
    )
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")
    return question


@router.post("/evaluations", response_model=EvaluationResultResponse, status_code=status.HTTP_201_CREATED)
def submit_answer(
    payload: SubmitAnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ai_service: AIService = Depends(get_ai_service),
) -> EvaluationResultResponse:
    question = db.scalar(
        select(Question).where(
            Question.id == payload.question_id,
            Question.user_id == current_user.id,
        )
    )
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

    answer = Answer(
        user_id=current_user.id,
        question_id=question.id,
        user_answer=payload.user_answer.strip(),
    )
    db.add(answer)
    db.flush()

    review = ai_service.evaluate_answer(question.question_text, payload.user_answer.strip())
    evaluation = Evaluation(
        user_id=current_user.id,
        answer_id=answer.id,
        question_id=question.id,
        score=int(review["score"]),
        feedback=review["feedback"],
        missing_points=review["missing_points"],
        ideal_answer=review["ideal_answer"],
    )
    db.add(evaluation)
    db.commit()
    db.refresh(answer)
    db.refresh(evaluation)

    return EvaluationResultResponse(
        evaluation_id=evaluation.id,
        answer_id=answer.id,
        question_id=question.id,
        batch_id=question.batch_id,
        question_text=question.question_text,
        user_answer=answer.user_answer,
        score=evaluation.score,
        feedback=evaluation.feedback,
        missing_points=evaluation.missing_points,
        ideal_answer=evaluation.ideal_answer,
        created_at=evaluation.created_at,
    )


@router.get("/evaluations/{evaluation_id}", response_model=EvaluationResultResponse)
def get_evaluation(
    evaluation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EvaluationResultResponse:
    row = db.execute(
        select(Evaluation, Answer, Question)
        .join(Answer, Evaluation.answer_id == Answer.id)
        .join(Question, Evaluation.question_id == Question.id)
        .where(
            Evaluation.id == evaluation_id,
            Evaluation.user_id == current_user.id,
        )
    ).first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found.",
        )

    evaluation, answer, question = row
    return EvaluationResultResponse(
        evaluation_id=evaluation.id,
        answer_id=answer.id,
        question_id=question.id,
        batch_id=question.batch_id,
        question_text=question.question_text,
        user_answer=answer.user_answer,
        score=evaluation.score,
        feedback=evaluation.feedback,
        missing_points=evaluation.missing_points,
        ideal_answer=evaluation.ideal_answer,
        created_at=evaluation.created_at,
    )


@router.get("/history", response_model=list[HistoryItemResponse])
def get_history(
    job_role: str | None = Query(default=None),
    difficulty: str | None = Query(default=None),
    min_score: int | None = Query(default=None, ge=0, le=10),
    max_score: int | None = Query(default=None, ge=0, le=10),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[HistoryItemResponse]:
    query = (
        select(Evaluation, Answer, Question)
        .join(Answer, Evaluation.answer_id == Answer.id)
        .join(Question, Evaluation.question_id == Question.id)
        .where(Evaluation.user_id == current_user.id)
        .order_by(Evaluation.created_at.desc(), Evaluation.id.desc())
    )

    if job_role:
        query = query.where(Question.job_role.ilike(job_role.strip()))
    if difficulty:
        query = query.where(Question.difficulty.ilike(difficulty.strip()))
    if min_score is not None:
        query = query.where(Evaluation.score >= min_score)
    if max_score is not None:
        query = query.where(Evaluation.score <= max_score)

    rows = db.execute(query).all()
    return [
        HistoryItemResponse(
            evaluation_id=evaluation.id,
            question_id=question.id,
            job_role=question.job_role,
            difficulty=question.difficulty,
            question_text=question.question_text,
            user_answer=answer.user_answer,
            score=evaluation.score,
            feedback=evaluation.feedback,
            missing_points=evaluation.missing_points,
            ideal_answer=evaluation.ideal_answer,
            answered_at=evaluation.created_at,
        )
        for evaluation, answer, question in rows
    ]


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalyticsResponse:
    total_attempts = db.scalar(
        select(func.count()).select_from(Evaluation).where(Evaluation.user_id == current_user.id)
    ) or 0

    avg_score = db.scalar(
        select(func.avg(Evaluation.score)).where(Evaluation.user_id == current_user.id)
    )
    top_score = db.scalar(
        select(func.max(Evaluation.score)).where(Evaluation.user_id == current_user.id)
    )
    low_score = db.scalar(
        select(func.min(Evaluation.score)).where(Evaluation.user_id == current_user.id)
    )

    difficulty_rows = db.execute(
        select(Question.difficulty, func.avg(Evaluation.score))
        .join(Evaluation, Evaluation.question_id == Question.id)
        .where(Evaluation.user_id == current_user.id)
        .group_by(Question.difficulty)
        .order_by(Question.difficulty.asc())
    ).all()

    timeline_rows = db.execute(
        select(Evaluation.id, Evaluation.score)
        .where(Evaluation.user_id == current_user.id)
        .order_by(Evaluation.id.asc())
    ).all()

    return AnalyticsResponse(
        total_attempts=total_attempts,
        average_score=round(float(avg_score or 0), 2),
        top_score=int(top_score or 0),
        lowest_score=int(low_score or 0),
        difficulty_breakdown=[
            DifficultyBreakdownItem(
                difficulty=str(difficulty),
                average_score=round(float(score or 0), 2),
            )
            for difficulty, score in difficulty_rows
        ],
        timeline=[
            TimelinePoint(attempt=int(attempt), score=int(score))
            for attempt, score in timeline_rows
        ],
    )
