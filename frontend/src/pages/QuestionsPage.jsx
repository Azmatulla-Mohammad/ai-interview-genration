import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

import { EmptyState } from "../components/EmptyState";
import { LoadingBlock } from "../components/LoadingBlock";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export function QuestionsPage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const batchId = searchParams.get("batchId") || "";
  const jobRole = searchParams.get("jobRole") || "";
  const difficulty = searchParams.get("difficulty") || "";
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "5");

  function buildQuestionPath(question) {
    const params = new URLSearchParams({
      batchId: question.batch_id,
      pageSize: String(pageSize),
      jobRole: question.job_role || jobRole,
      difficulty: question.difficulty || difficulty,
    });
    return `/questions/${question.id}?${params.toString()}`;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      setLoading(true);
      setError("");

      try {
        const data = await api.getQuestions(
          {
            batch_id: batchId,
            job_role: jobRole,
            difficulty,
            page,
            page_size: pageSize,
          },
          token,
        );

        if (!cancelled) {
          setResponse(data);
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

    loadQuestions();

    return () => {
      cancelled = true;
    };
  }, [batchId, difficulty, jobRole, page, pageSize, token]);

  function moveToPage(nextPage) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(nextPage));
    setSearchParams(params);
  }

  if (loading) {
    return <LoadingBlock label="Loading your question set..." />;
  }

  return (
    <div className="page-stack">
      <section className="panel section-heading-row">
        <div>
          <div className="status-chip status-chip-live">
            <span className="status-dot" />
            Interview session ready
          </div>
          <span className="eyebrow">Generated questions</span>
          <h1>{jobRole || "Interview questions"}</h1>
          <p>
            {difficulty
              ? `${response?.total || 0} questions at ${difficulty} difficulty. Start with question 1, submit your answer, and move through the session step by step.`
              : "Answer each question and review the feedback after each submission."}
          </p>
        </div>
        <div className="button-row">
          {response?.items?.[0] ? (
            <Link
              to={buildQuestionPath(response.items[0])}
              className="button button-primary button-small"
            >
              Enter interview mode
            </Link>
          ) : null}
          <Link to="/generate" className="button button-secondary button-small">
            Generate another set
          </Link>
          <Link to="/dashboard" className="button button-ghost button-small">
            Dashboard
          </Link>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      {!response?.items?.length ? (
        <EmptyState
          title="No questions found"
          message="Try generating a fresh set or adjust your filters."
          action={
            <Link to="/generate" className="button button-primary">
              Generate questions
            </Link>
          }
        />
      ) : (
        <>
          <section className="session-stat-grid">
            <article className="panel session-stat-card">
              <span className="eyebrow">Total questions</span>
              <strong>{response.total}</strong>
              <p>Each answer is evaluated separately so you can improve one round at a time.</p>
            </article>
            <article className="panel session-stat-card">
              <span className="eyebrow">Difficulty</span>
              <strong>{difficulty || "Mixed"}</strong>
              <p>Use the same session to build rhythm, confidence, and structure under pressure.</p>
            </article>
            <article className="panel session-stat-card">
              <span className="eyebrow">Flow</span>
              <strong>Question 1 to {response.total}</strong>
              <p>Finish one answer, review the result, then continue with the next question.</p>
            </article>
          </section>

          <section className="question-grid">
            {response.items.map((question, index) => (
              <article key={question.id} className="panel question-card">
                <div className="question-card-top">
                  <span className="score-pill">Question {(response.page - 1) * response.page_size + index + 1}</span>
                  <span className="question-meta-tag">{question.difficulty}</span>
                </div>
                <h3>{question.question_text}</h3>
                <p className="muted">Role: {question.job_role}</p>
                <Link
                  to={buildQuestionPath(question)}
                  className="button button-primary button-small"
                >
                  Open question
                </Link>
              </article>
            ))}
          </section>

          {response.total_pages > 1 ? (
            <section className="panel pagination-panel">
              <p>
                Page {response.page} of {response.total_pages}
              </p>
              <div className="button-row">
                <button
                  type="button"
                  className="button button-secondary button-small"
                  disabled={response.page <= 1}
                  onClick={() => moveToPage(response.page - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="button button-primary button-small"
                  disabled={response.page >= response.total_pages}
                  onClick={() => moveToPage(response.page + 1)}
                >
                  Next
                </button>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
