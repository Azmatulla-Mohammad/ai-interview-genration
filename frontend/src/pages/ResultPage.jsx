import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { FormattedText } from "../components/FormattedText";
import { LoadingBlock } from "../components/LoadingBlock";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export function ResultPage() {
  const { evaluationId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const [result, setResult] = useState(null);
  const [batchQuestions, setBatchQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const batchIdFromRoute = searchParams.get("batchId") || "";
  const pageSize = Number(searchParams.get("pageSize") || "10");
  const queryJobRole = searchParams.get("jobRole") || "";
  const queryDifficulty = searchParams.get("difficulty") || "";

  useEffect(() => {
    let cancelled = false;

    async function loadResult() {
      try {
        const data = await api.getEvaluation(evaluationId, token);
        if (!cancelled) {
          setResult(data);
        }

        const batchId = batchIdFromRoute || data.batch_id;
        if (batchId) {
          const questionList = await api.getQuestions(
            {
              batch_id: batchId,
              page: 1,
              page_size: Math.max(pageSize, 20),
            },
            token,
          );
          if (!cancelled) {
            setBatchQuestions(questionList.items || []);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadResult();

    return () => {
      cancelled = true;
    };
  }, [batchIdFromRoute, evaluationId, pageSize, token]);

  const progress = useMemo(() => {
    if (!result || !batchQuestions.length) {
      return {
        currentIndex: -1,
        nextQuestion: null,
        previousQuestion: null,
        total: batchQuestions.length,
      };
    }

    const currentIndex = batchQuestions.findIndex(
      (question) => question.id === result.question_id,
    );
    return {
      currentIndex,
      nextQuestion:
        currentIndex >= 0 ? batchQuestions[currentIndex + 1] || null : null,
      previousQuestion:
        currentIndex > 0 ? batchQuestions[currentIndex - 1] || null : null,
      total: batchQuestions.length,
    };
  }, [batchQuestions, result]);

  const currentQuestion =
    batchQuestions.find((item) => item.id === result?.question_id) || null;
  const resolvedJobRole =
    queryJobRole || currentQuestion?.job_role || batchQuestions[0]?.job_role || "";
  const resolvedDifficulty =
    queryDifficulty || currentQuestion?.difficulty || batchQuestions[0]?.difficulty || "";
  const resolvedPageSize = Math.max(
    progress.total || 0,
    batchQuestions.length || 0,
    pageSize,
    5,
  );

  function buildQuestionPath(targetQuestionId) {
    const params = new URLSearchParams({
      batchId: result?.batch_id || batchIdFromRoute,
      pageSize: String(resolvedPageSize),
      jobRole: resolvedJobRole,
      difficulty: resolvedDifficulty,
    });
    return `/questions/${targetQuestionId}?${params.toString()}`;
  }

  const nextQuestionPath = progress.nextQuestion
    ? buildQuestionPath(progress.nextQuestion.id)
    : "";
  const retakeQuestionPath = result?.question_id
    ? buildQuestionPath(result.question_id)
    : "/questions";

  if (loading) {
    return <LoadingBlock label="Loading evaluation result..." />;
  }

  return (
    <div className="page-stack">
      <section className="practice-layout">
        <div className="panel result-layout practice-main-panel">
          <div className="result-score-card">
            <div className="status-chip status-chip-live">
              <span className="status-dot" />
              Answer reviewed
            </div>
            <div
              className="score-ring"
              style={{ "--score-angle": `${((result?.score || 0) / 10) * 360}deg` }}
            >
              <div>
                <span>Score</span>
                <strong>{result?.score ?? 0}/10</strong>
              </div>
            </div>
            <p className="muted">Use the detailed review below to refine structure, coverage, and examples.</p>
            <div className="result-summary-strip">
              <div className="result-summary-pill">
                <span>Session step</span>
                <strong>
                  {progress.currentIndex >= 0 ? `${progress.currentIndex + 1} / ${progress.total}` : "Review"}
                </strong>
              </div>
              <div className="result-summary-pill">
                <span>Status</span>
                <strong>{progress.nextQuestion ? "Continue" : "Complete"}</strong>
              </div>
            </div>
            <div className="button-row">
              {progress.nextQuestion ? (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => navigate(nextQuestionPath)}
                >
                  Next question
                </button>
              ) : (
                <Link to="/history" className="button button-primary">
                  Finish session
                </Link>
              )}
              <Link to={retakeQuestionPath} className="button button-secondary">
                Retake question
              </Link>
            </div>
          </div>

          <div className="result-detail-stack">
            <div className="interview-session-banner result-banner">
              <div>
                <span className="eyebrow">Evaluation result</span>
                <h1>Your interview answer review</h1>
                <p>
                  Review what worked, close the gaps, and move immediately into the next question while the interview rhythm is still fresh.
                </p>
              </div>
              <div className="hero-chip-row">
                <span className="hero-chip">{resolvedJobRole || "Interview session"}</span>
                <span className="hero-chip">{resolvedDifficulty || "Difficulty"}</span>
                <span className="hero-chip">
                  {progress.nextQuestion ? "Next question ready" : "Session complete"}
                </span>
              </div>
            </div>

            <div className="section-heading-row">
              <div>
                <span className="eyebrow">Review details</span>
                <h2>Break down the answer before moving on.</h2>
              </div>
              <div className="button-row">
                <Link to="/history" className="button button-secondary button-small">
                  View history
                </Link>
                {progress.previousQuestion ? (
                  <Link
                    to={buildQuestionPath(progress.previousQuestion.id)}
                    className="button button-ghost button-small"
                  >
                    Previous question
                  </Link>
                ) : null}
              </div>
            </div>

            {error ? <p className="form-error">{error}</p> : null}

            {progress.currentIndex >= 0 ? (
              <p className="result-progress-note">
                Question {progress.currentIndex + 1} of {progress.total}
                {progress.nextQuestion ? ` completed. Question ${progress.currentIndex + 2} is ready next.` : " completed. You have finished this question set."}
              </p>
            ) : null}

            <article className="panel nested-panel spotlight-card">
              <span className="eyebrow">Question</span>
              <FormattedText text={result?.question_text} />
            </article>

            <article className="panel nested-panel">
              <span className="eyebrow">Your answer</span>
              <FormattedText text={result?.user_answer} />
            </article>

            <div className="review-grid">
              <article className="panel nested-panel review-card review-card-accent">
                <span className="eyebrow">Feedback</span>
                <FormattedText text={result?.feedback} />
              </article>

              <article className="panel nested-panel review-card review-card-warm">
                <span className="eyebrow">Missing points</span>
                <FormattedText text={result?.missing_points} />
              </article>
            </div>

            <article className="panel nested-panel review-card review-card-cool">
              <span className="eyebrow">Ideal answer</span>
              <FormattedText text={result?.ideal_answer} />
            </article>

            <div className="practice-action-bar result-action-bar">
              <div className="inline-hint">
                {progress.nextQuestion
                  ? `Ready for question ${progress.currentIndex + 2}.`
                  : "This session is complete. You can start another round anytime."}
              </div>
              <div className="button-row">
                {progress.nextQuestion ? (
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => navigate(nextQuestionPath)}
                  >
                    Continue to next question
                  </button>
                ) : (
                  <Link to="/generate" className="button button-primary">
                    Start a new session
                  </Link>
                )}
                <Link to="/history" className="button button-secondary">
                  Open history
                </Link>
              </div>
            </div>
          </div>
        </div>

        <aside className="panel practice-sidebar">
          <div className="practice-sidebar-section">
            <div className="status-chip status-chip-quiet">
              <span className="status-dot" />
              Session navigator
            </div>
            <span className="eyebrow">Session status</span>
            <h2>{progress.total ? `${progress.total} questions in this set` : "Practice session"}</h2>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${progress.total ? ((Math.max(progress.currentIndex, 0) + 1) / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="muted">
              {progress.nextQuestion
                ? "Your current answer is saved. Move to the next question to continue the session."
                : "All questions in this session are complete. Review history or start another round."}
            </p>
          </div>

          <div className="panel next-cue-card">
            <span className="eyebrow">Next move</span>
            <h3>
              {progress.nextQuestion
                ? `Continue with question ${progress.currentIndex + 2}`
                : "This interview set is complete"}
            </h3>
            <p>
              {progress.nextQuestion
                ? "Use the next button to stay in the same interview rhythm and keep the session flowing."
                : "Review the history or generate another set to start a new mock interview round."}
            </p>
            {progress.nextQuestion ? (
              <button
                type="button"
                className="button button-primary button-small"
                onClick={() => navigate(nextQuestionPath)}
              >
                Next question
              </button>
            ) : (
              <Link to="/generate" className="button button-secondary button-small">
                New session
              </Link>
            )}
          </div>

          {batchQuestions.length ? (
            <div className="practice-sidebar-section">
              <h3>Question order</h3>
              <div className="session-step-list">
                {batchQuestions.map((item, index) => {
                  const isCurrent = item.id === result?.question_id;
                  const isComplete = index < progress.currentIndex;
                  const isNext = item.id === progress.nextQuestion?.id;
                  const stateClass = isCurrent
                    ? "session-step-current"
                    : isComplete
                      ? "session-step-complete"
                      : isNext
                        ? "session-step-upcoming"
                        : "session-step-locked";
                  const stepContent = (
                    <>
                      <span className="session-step-number">{index + 1}</span>
                      <div className="session-step-copy">
                        <strong>
                          {isCurrent
                            ? "Just answered"
                            : isNext
                              ? "Next question"
                              : isComplete
                                ? `Question ${index + 1}`
                                : "Locked question"}
                        </strong>
                        {isCurrent || isComplete || isNext ? (
                          <p>{item.question_text}</p>
                        ) : (
                          <>
                            <div className="session-step-mask" aria-hidden="true">
                              <span />
                              <span />
                            </div>
                            <span className="session-step-lock-note">
                              Finish the next step to reveal question {index + 1}.
                            </span>
                          </>
                        )}
                      </div>
                    </>
                  );

                  if (isComplete || isNext) {
                    return (
                      <Link
                        key={item.id}
                        to={buildQuestionPath(item.id)}
                        className={`session-step-card session-step-interactive ${stateClass}`}
                      >
                        {stepContent}
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      className={`session-step-card session-step-static ${stateClass}`}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      {stepContent}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
