import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { EmptyState } from "../components/EmptyState";
import { LoadingBlock } from "../components/LoadingBlock";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { DIFFICULTY_LEVELS } from "../lib/constants";

export function HistoryPage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    jobRole: searchParams.get("jobRole") || "",
    difficulty: searchParams.get("difficulty") || "",
    minScore: searchParams.get("minScore") || "",
    maxScore: searchParams.get("maxScore") || "",
  });

  useEffect(() => {
    setFilters({
      jobRole: searchParams.get("jobRole") || "",
      difficulty: searchParams.get("difficulty") || "",
      minScore: searchParams.get("minScore") || "",
      maxScore: searchParams.get("maxScore") || "",
    });
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError("");

      try {
        const data = await api.getHistory(
          {
            job_role: searchParams.get("jobRole") || "",
            difficulty: searchParams.get("difficulty") || "",
            min_score: searchParams.get("minScore") || "",
            max_score: searchParams.get("maxScore") || "",
          },
          token,
        );

        if (!cancelled) {
          setItems(data);
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

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [searchParams, token]);

  function handleFilterSubmit(event) {
    event.preventDefault();
    const params = new URLSearchParams();

    if (filters.jobRole) {
      params.set("jobRole", filters.jobRole);
    }
    if (filters.difficulty) {
      params.set("difficulty", filters.difficulty);
    }
    if (filters.minScore) {
      params.set("minScore", filters.minScore);
    }
    if (filters.maxScore) {
      params.set("maxScore", filters.maxScore);
    }

    setSearchParams(params);
  }

  if (loading) {
    return <LoadingBlock label="Loading your answer history..." />;
  }

  return (
    <div className="page-stack">
      <section className="panel section-stack">
        <div className="section-heading-row">
          <div>
            <span className="eyebrow">History</span>
            <h1>Review your answer evaluations</h1>
          </div>
          <Link to="/generate" className="button button-primary button-small">
            New practice round
          </Link>
        </div>

        <form className="filter-grid" onSubmit={handleFilterSubmit}>
          <label className="field">
            <span>Job role</span>
            <input
              type="text"
              value={filters.jobRole}
              onChange={(event) =>
                setFilters((current) => ({ ...current, jobRole: event.target.value }))
              }
              placeholder="Python Developer"
            />
          </label>

          <label className="field">
            <span>Difficulty</span>
            <select
              value={filters.difficulty}
              onChange={(event) =>
                setFilters((current) => ({ ...current, difficulty: event.target.value }))
              }
            >
              <option value="">All levels</option>
              {DIFFICULTY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Min score</span>
            <input
              type="number"
              min="0"
              max="10"
              value={filters.minScore}
              onChange={(event) =>
                setFilters((current) => ({ ...current, minScore: event.target.value }))
              }
            />
          </label>

          <label className="field">
            <span>Max score</span>
            <input
              type="number"
              min="0"
              max="10"
              value={filters.maxScore}
              onChange={(event) =>
                setFilters((current) => ({ ...current, maxScore: event.target.value }))
              }
            />
          </label>

          <div className="button-row">
            <button type="submit" className="button button-primary button-small">
              Apply filters
            </button>
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={() => setSearchParams({})}
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      {!items.length ? (
        <EmptyState
          title="No history found"
          message="Submit at least one answer to build your review history."
          action={
            <Link to="/generate" className="button button-primary">
              Generate questions
            </Link>
          }
        />
      ) : (
        <section className="history-list">
          {items.map((item) => (
            <article key={item.evaluation_id} className="panel history-card">
              <div className="history-card-header">
                <div>
                  <span className="eyebrow">{item.job_role}</span>
                  <h2>{item.question_text}</h2>
                </div>
                <div className="history-meta">
                  <span className="question-meta-tag">{item.difficulty}</span>
                  <span className="score-pill">Score {item.score}/10</span>
                </div>
              </div>

              <div className="history-copy-grid">
                <div>
                  <h3>Your answer</h3>
                  <p>{item.user_answer}</p>
                </div>
                <div>
                  <h3>Feedback</h3>
                  <p>{item.feedback}</p>
                </div>
                <div>
                  <h3>Missing points</h3>
                  <p>{item.missing_points}</p>
                </div>
                <div>
                  <h3>Ideal answer</h3>
                  <p>{item.ideal_answer}</p>
                </div>
              </div>

              <div className="button-row">
                <Link to={`/results/${item.evaluation_id}`} className="button button-secondary button-small">
                  Open result
                </Link>
                <Link to={`/questions/${item.question_id}`} className="button button-primary button-small">
                  Retake question
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
