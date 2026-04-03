import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { LoadingBlock } from "../components/LoadingBlock";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export function AnswerPage() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const [question, setQuestion] = useState(null);
  const [batchQuestions, setBatchQuestions] = useState([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const queryBatchId = searchParams.get("batchId") || "";
  const queryPageSize = Number(searchParams.get("pageSize") || "20");
  const queryJobRole = searchParams.get("jobRole") || "";
  const queryDifficulty = searchParams.get("difficulty") || "";

  useEffect(() => {
    let cancelled = false;

    async function loadQuestion() {
      try {
        const data = await api.getQuestion(questionId, token);
        if (!cancelled) {
          setQuestion(data);
        }

        const batchId = queryBatchId || data.batch_id;
        if (batchId) {
          const batchResponse = await api.getQuestions(
            {
              batch_id: batchId,
              page: 1,
              page_size: Math.max(queryPageSize, 20),
            },
            token,
          );
          if (!cancelled) {
            setBatchQuestions(batchResponse.items || []);
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

    loadQuestion();

    return () => {
      cancelled = true;
    };
  }, [queryBatchId, queryPageSize, questionId, token]);

  useEffect(() => {
    setAnswer("");
  }, [question?.id]);

  const progress = useMemo(() => {
    if (!question || !batchQuestions.length) {
      return {
        currentIndex: -1,
        total: batchQuestions.length,
        nextQuestion: null,
        previousQuestion: null,
        remainingCount: batchQuestions.length,
      };
    }

    const currentIndex = batchQuestions.findIndex((item) => item.id === question.id);
    return {
      currentIndex,
      total: batchQuestions.length,
      nextQuestion: currentIndex >= 0 ? batchQuestions[currentIndex + 1] || null : null,
      previousQuestion: currentIndex > 0 ? batchQuestions[currentIndex - 1] || null : null,
      remainingCount:
        currentIndex >= 0 ? Math.max(batchQuestions.length - currentIndex - 1, 0) : batchQuestions.length,
    };
  }, [batchQuestions, question]);

  const resolvedJobRole =
    question?.job_role || queryJobRole || batchQuestions[0]?.job_role || "";
  const resolvedDifficulty =
    question?.difficulty || queryDifficulty || batchQuestions[0]?.difficulty || "";
  const resolvedPageSize = Math.max(
    progress.total || 0,
    batchQuestions.length || 0,
    queryPageSize,
    5,
  );

  function buildSessionPath(targetQuestionId) {
    const params = new URLSearchParams({
      batchId: question?.batch_id || queryBatchId,
      pageSize: String(resolvedPageSize),
      jobRole: resolvedJobRole,
      difficulty: resolvedDifficulty,
    });
    return `/questions/${targetQuestionId}?${params.toString()}`;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const result = await api.submitAnswer(
        {
          question_id: Number(questionId),
          user_answer: answer,
        },
        token,
      );
      const params = new URLSearchParams();
      params.set("batchId", question?.batch_id || searchParams.get("batchId") || result.batch_id);
      params.set("pageSize", String(resolvedPageSize));
      params.set("jobRole", resolvedJobRole);
      params.set("difficulty", resolvedDifficulty);
      navigate(`/results/${result.evaluation_id}?${params.toString()}`);
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingBlock label="Loading your question..." />;
  }

  return (
    <div className="page-stack">
      <section className="practice-layout">
        <div className="panel question-answer-panel practice-main-panel">
          <div className="interview-session-banner">
            <div>
              <div className="status-chip status-chip-live">
                <span className="status-dot" />
                Live interview mode
              </div>
              <span className="eyebrow">Practice session</span>
              <h1>
                {progress.currentIndex >= 0
                  ? `Question ${progress.currentIndex + 1} of ${progress.total}`
                  : resolvedJobRole || "Interview question"}
              </h1>
              <p>
                Answer with structure, explain your reasoning clearly, and keep your examples practical like a real interview round.
              </p>
            </div>
            <div className="hero-chip-row">
              <span className="hero-chip">{resolvedJobRole || "Role focus"}</span>
              <span className="hero-chip">{resolvedDifficulty || "Difficulty"}</span>
              <span className="hero-chip">
                {progress.remainingCount > 0
                  ? `${progress.remainingCount} question${progress.remainingCount > 1 ? "s" : ""} left`
                  : "Final question"}
              </span>
            </div>
          </div>

          <div className="interview-hud-grid">
            <article className="panel interview-hud-card">
              <span className="eyebrow">Current step</span>
              <strong>
                {progress.currentIndex >= 0 ? `${progress.currentIndex + 1} / ${progress.total}` : "In session"}
              </strong>
              <p>Focus on accuracy first, then polish clarity and examples.</p>
            </article>
            <article className="panel interview-hud-card">
              <span className="eyebrow">Session rhythm</span>
              <strong>{progress.remainingCount > 0 ? "Keep momentum" : "Finish strong"}</strong>
              <p>
                {progress.nextQuestion
                  ? `Submit this answer to unlock question ${progress.currentIndex + 2}.`
                  : "This answer closes the session, so make your final points count."}
              </p>
            </article>
            <article className="panel interview-hud-card">
              <span className="eyebrow">Answer style</span>
              <strong>Definition, reasoning, example</strong>
              <p>That structure usually creates a more interview-ready answer than short bullet points.</p>
            </article>
          </div>

          <div className="section-heading-row">
            <div>
              <span className="eyebrow">Question prompt</span>
              <h2>{resolvedJobRole || "Interview question"}</h2>
            </div>
            <div className="button-row">
              <Link to="/history" className="button button-secondary button-small">
                View history
              </Link>
              {progress.previousQuestion ? (
                <Link
                  to={buildSessionPath(progress.previousQuestion.id)}
                  className="button button-secondary button-small"
                >
                  Previous question
                </Link>
              ) : null}
              {question?.batch_id ? (
                <Link
                  to={`/questions?batchId=${question.batch_id}&jobRole=${encodeURIComponent(question.job_role)}&difficulty=${encodeURIComponent(question.difficulty)}&page=1&pageSize=${queryPageSize}`}
                  className="button button-ghost button-small"
                >
                  Question set
                </Link>
              ) : null}
            </div>
          </div>

          {progress.currentIndex >= 0 ? (
            <p className="result-progress-note">
              Question {progress.currentIndex + 1} of {progress.total}
              {progress.nextQuestion ? ` is ready. Submit this answer to continue to question ${progress.currentIndex + 2}.` : " is the last question in this set."}
            </p>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}

          <article className="question-prompt question-prompt-large spotlight-card">
            <div className="question-card-top">
              <span className="question-meta-tag">{resolvedDifficulty || "Difficulty"}</span>
              {progress.currentIndex >= 0 ? <span className="score-pill">Step {progress.currentIndex + 1}</span> : null}
            </div>
            <p>{question?.question_text}</p>
          </article>

          <div className="panel response-studio">
            <div className="response-studio-header">
              <div>
                <span className="eyebrow">Response studio</span>
                <h3>Draft your answer like you are speaking to an interviewer.</h3>
              </div>
              <p className="muted">
                Start with the main idea, explain why it matters, then close with one concrete example.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="section-stack">
              <label className="field">
                <span>Your answer</span>
                <textarea
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Write a structured answer with definition, reasoning, tradeoffs, and one practical example."
                  rows="12"
                  required
                />
              </label>

              <div className="practice-action-bar">
                <div className="practice-action-meta">
                  <div className="inline-hint">
                    {progress.nextQuestion
                      ? `Next in queue: Question ${progress.currentIndex + 2}`
                      : "This is the final question in the current session."}
                  </div>
                  {progress.nextQuestion ? (
                    <Link
                      to={buildSessionPath(progress.nextQuestion.id)}
                      className="button button-secondary button-small"
                    >
                      Next question
                    </Link>
                  ) : null}
                </div>
                <div className="button-row">
                  <button type="submit" className="button button-primary" disabled={submitting}>
                    {submitting ? "Evaluating..." : "Submit answer"}
                  </button>
                  <Link to="/generate" className="button button-ghost">
                    Generate another session
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>

        <aside className="panel practice-sidebar">
          <div className="practice-sidebar-section">
            <div className="status-chip status-chip-quiet">
              <span className="status-dot" />
              Session navigator
            </div>
            <span className="eyebrow">Session progress</span>
            <h2>{progress.total ? `${progress.total} question session` : "Practice session"}</h2>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${progress.total ? ((Math.max(progress.currentIndex, 0) + 1) / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="muted">
              Answer one question at a time. After each evaluation, use the
              next question button to continue the session.
            </p>
          </div>

          <div className="panel next-cue-card">
            <span className="eyebrow">Next action</span>
            <h3>
              {progress.nextQuestion
                ? `Question ${progress.currentIndex + 2} is lined up next`
                : "Complete this answer to finish the session"}
            </h3>
            <p>
              {progress.nextQuestion
                ? "After you submit, you will land on the review page with a clear button to continue to the next question."
                : "Your evaluation screen will summarize the session and let you finish cleanly."}
            </p>
          </div>

          {batchQuestions.length ? (
            <div className="practice-sidebar-section">
              <h3>Question order</h3>
              <div className="session-step-list">
                {batchQuestions.map((item, index) => {
                  const isCurrent = item.id === question?.id;
                  const isComplete = index < progress.currentIndex;
                  const isLocked = index > progress.currentIndex;
                  const stateClass = isCurrent
                    ? "session-step-current"
                    : isComplete
                      ? "session-step-complete"
                      : "session-step-locked";
                  const stepContent = (
                    <>
                      <span className="session-step-number">{index + 1}</span>
                      <div className="session-step-copy">
                        <strong>
                          {isCurrent
                            ? "Current question"
                            : isComplete
                              ? `Question ${index + 1}`
                              : "Locked until submit"}
                        </strong>
                        {isLocked ? (
                          <>
                            <div className="session-step-mask" aria-hidden="true">
                              <span />
                              <span />
                            </div>
                            <span className="session-step-lock-note">
                              Submit this answer to reveal question {index + 1}.
                            </span>
                          </>
                        ) : (
                          <p>{item.question_text}</p>
                        )}
                      </div>
                    </>
                  );

                  if (isComplete) {
                    return (
                      <Link
                        key={item.id}
                        to={buildSessionPath(item.id)}
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
