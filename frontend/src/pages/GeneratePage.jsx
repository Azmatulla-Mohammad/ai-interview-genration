import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { DIFFICULTY_LEVELS, JOB_ROLES, QUESTION_COUNT_OPTIONS } from "../lib/constants";

export function GeneratePage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [form, setForm] = useState({
    job_role: JOB_ROLES[0],
    difficulty: DIFFICULTY_LEVELS[0],
    question_count: QUESTION_COUNT_OPTIONS[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const questions = await api.generateQuestions(form, token);
      const batchId = questions[0]?.batch_id;
      const firstQuestionId = questions[0]?.id;
      const params = new URLSearchParams({
        pageSize: String(Math.max(questions.length, form.question_count)),
        jobRole: form.job_role,
        difficulty: form.difficulty,
      });

      if (batchId) {
        params.set("batchId", batchId);
      }

      if (firstQuestionId) {
        navigate(`/questions/${firstQuestionId}?${params.toString()}`);
      } else {
        navigate(`/questions?${params.toString()}`);
      }
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="panel page-banner">
        <div>
          <span className="eyebrow">Question generation</span>
          <h1>Build a fresh interview set.</h1>
          <p>
            Choose a role, difficulty, and batch size, then generate a focused
            interview session. You will start at question 1 and move through the
            set one question at a time.
          </p>
        </div>
      </section>

      <form className="panel form-panel wide-form-panel" onSubmit={handleSubmit}>
        <div className="select-grid">
          <label className="field">
            <span>Job role</span>
            <select
              value={form.job_role}
              onChange={(event) =>
                setForm((current) => ({ ...current, job_role: event.target.value }))
              }
            >
              {JOB_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Difficulty</span>
            <select
              value={form.difficulty}
              onChange={(event) =>
                setForm((current) => ({ ...current, difficulty: event.target.value }))
              }
            >
              {DIFFICULTY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Number of questions</span>
            <select
              value={form.question_count}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  question_count: Number(event.target.value),
                }))
              }
            >
              {QUESTION_COUNT_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {count} questions
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="button-row">
          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? "Generating..." : "Generate questions"}
          </button>
          <Link to="/dashboard" className="button button-secondary">
            Back to dashboard
          </Link>
        </div>
      </form>
    </div>
  );
}
