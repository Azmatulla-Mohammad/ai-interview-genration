import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
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
      await login(form);
      const redirectTo = location.state?.from?.pathname || "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="form-layout">
      <div className="form-side">
        <span className="eyebrow">Welcome back</span>
        <h1>Sign in and continue your interview prep.</h1>
        <p>
          Pick up where you left off, generate fresh question sets, and review
          your latest evaluations.
        </p>
      </div>

      <form className="panel form-panel" onSubmit={handleSubmit}>
        <h2>Login</h2>
        <p className="form-caption">Use the account you created for your practice history.</p>

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
            placeholder="Enter your password"
            required
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" className="button button-primary button-full" disabled={submitting}>
          {submitting ? "Signing in..." : "Login"}
        </button>

        <p className="form-footnote">
          Need an account? <Link to="/register">Create one here</Link>.
        </p>
      </form>
    </section>
  );
}
