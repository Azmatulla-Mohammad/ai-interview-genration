import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { EmptyState } from "../components/EmptyState";
import { LoadingBlock } from "../components/LoadingBlock";
import { StatCard } from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export function DashboardPage() {
  const { token, user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [analyticsData, historyData] = await Promise.all([
          api.getAnalytics(token),
          api.getHistory({}, token),
        ]);

        if (!cancelled) {
          setAnalytics(analyticsData);
          setRecentHistory(historyData.slice(0, 3));
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

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return <LoadingBlock label="Loading your dashboard..." />;
  }

  return (
    <div className="page-stack">
      <section className="panel page-banner">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1>{user?.name ? `Welcome back, ${user.name}.` : "Welcome back."}</h1>
          <p>
            Generate new interview rounds, review your recent answers, and keep
            your score moving in the right direction.
          </p>
        </div>
        <Link to="/generate" className="button button-primary">
          Generate a new practice set
        </Link>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="stats-grid">
        <StatCard label="Total attempts" value={analytics?.total_attempts ?? 0} tone="accent" />
        <StatCard label="Average score" value={analytics?.average_score ?? 0} tone="cool" />
        <StatCard label="Top score" value={analytics?.top_score ?? 0} tone="warm" />
        <StatCard label="Lowest score" value={analytics?.lowest_score ?? 0} tone="default" />
      </section>

      <section className="card-grid">
        <Link to="/generate" className="panel action-panel">
          <h3>Generate questions</h3>
          <p>Create a role and difficulty based interview set in one step.</p>
        </Link>
        <Link to="/history" className="panel action-panel">
          <h3>Review history</h3>
          <p>Filter previous answers, compare feedback, and retake weak questions.</p>
        </Link>
        <Link to="/analytics" className="panel action-panel">
          <h3>Open analytics</h3>
          <p>See score trends and compare your performance by difficulty level.</p>
        </Link>
      </section>

      <section className="panel section-stack">
        <div className="section-heading-row">
          <div>
            <span className="eyebrow">Recent activity</span>
            <h2>Your latest answer reviews</h2>
          </div>
          <Link to="/history" className="button button-secondary button-small">
            View full history
          </Link>
        </div>

        {!recentHistory.length ? (
          <EmptyState
            title="No answers yet"
            message="Generate your first question set and submit an answer to start building history."
            action={
              <Link to="/generate" className="button button-primary">
                Start practicing
              </Link>
            }
          />
        ) : (
          <div className="history-preview-grid">
            {recentHistory.map((item) => (
              <article key={item.evaluation_id} className="history-preview-card">
                <div className="score-pill">Score {item.score}/10</div>
                <h3>{item.job_role}</h3>
                <p className="muted">{item.question_text}</p>
                <p>{item.feedback}</p>
                <div className="button-row">
                  <Link to={`/results/${item.evaluation_id}`} className="button button-secondary button-small">
                    Open result
                  </Link>
                  <Link to={`/questions/${item.question_id}`} className="button button-ghost button-small">
                    Retake
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
