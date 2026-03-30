import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await register(form);
      navigate("/dashboard", { replace: true });
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="form-layout">
      <div className="form-side">
        <span className="eyebrow">Create your practice space</span>
        <h1>Set up your account and start training in minutes.</h1>
        <p>
          Your question sets, answers, scores, and analytics stay grouped in one
          clean dashboard.
        </p>
      </div>

      <form className="panel form-panel" onSubmit={handleSubmit}>
        <h2>Create account</h2>
        <p className="form-caption">Your account is used to save questions, answers, and results.</p>

        <label className="field">
          <span>Full name</span>
          <input
            type="text"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Your name"
            required
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
            placeholder="At least 6 characters"
            required
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" className="button button-primary button-full" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </button>

        <p className="form-footnote">
          Already registered? <Link to="/login">Login here</Link>.
        </p>
      </form>
    </section>
  );
}
