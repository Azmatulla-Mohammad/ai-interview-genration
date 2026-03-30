import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const features = [
  {
    title: "Generate tailored interview questions",
    description:
      "Create role-specific practice sets in seconds, organized by difficulty and ready to answer right away.",
  },
  {
    title: "Get instant AI answer reviews",
    description:
      "Score every response, learn what you missed, and compare your answer with a stronger sample response.",
  },
  {
    title: "Track growth over time",
    description:
      "Review your answer history, retake questions, and spot patterns through a clean analytics dashboard.",
  },
];

const steps = [
  "Choose your target role and difficulty level.",
  "Answer one question at a time in a focused practice flow.",
  "Review AI feedback, retake weak areas, and improve your score trend.",
];

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">Modern interview practice for fast iteration</span>
          <h1>Train like the real interview is tomorrow.</h1>
          <p>
            AI Interview Coach helps you generate realistic interview questions,
            answer them in a clean workflow, and improve with structured
            feedback that is easy to act on.
          </p>

          <div className="button-row">
            <Link
              to={isAuthenticated ? "/generate" : "/register"}
              className="button button-primary"
            >
              {isAuthenticated ? "Start practicing" : "Create free account"}
            </Link>
            <Link
              to={isAuthenticated ? "/dashboard" : "/login"}
              className="button button-secondary"
            >
              {isAuthenticated ? "Open dashboard" : "I already have an account"}
            </Link>
          </div>
        </div>

        <div className="hero-panel">
          <div className="score-preview">
            <div className="score-preview-top">
              <span>Answer quality snapshot</span>
              <strong>8.6 / 10</strong>
            </div>
            <div className="score-preview-bars">
              <div style={{ width: "92%" }} />
              <div style={{ width: "76%" }} />
              <div style={{ width: "88%" }} />
            </div>
            <p>
              Strong structure, relevant examples, and improving clarity across
              repeated attempts.
            </p>
          </div>

          <div className="mini-panel-grid">
            <article className="mini-panel">
              <strong>5 questions</strong>
              <span>generated per round</span>
            </article>
            <article className="mini-panel">
              <strong>History view</strong>
              <span>with score filters and retakes</span>
            </article>
            <article className="mini-panel">
              <strong>Analytics</strong>
              <span>to track score trends</span>
            </article>
          </div>
        </div>
      </section>

      <section className="section-grid">
        {features.map((feature, index) => (
          <article key={feature.title} className="panel feature-panel">
            <span className="feature-index">0{index + 1}</span>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="panel section-split">
        <div>
          <span className="eyebrow">How the flow works</span>
          <h2>Keep the process simple, focused, and repeatable.</h2>
        </div>

        <div className="step-list">
          {steps.map((step, index) => (
            <div key={step} className="step-item">
              <span className="step-badge">{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
