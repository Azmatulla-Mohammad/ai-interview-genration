import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { BarChart } from "../components/BarChart";
import { EmptyState } from "../components/EmptyState";
import { LineChart } from "../components/LineChart";
import { LoadingBlock } from "../components/LoadingBlock";
import { StatCard } from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export function AnalyticsPage() {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      try {
        const data = await api.getAnalytics(token);
        if (!cancelled) {
          setAnalytics(data);
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

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return <LoadingBlock label="Loading analytics..." />;
  }

  return (
    <div className="page-stack">
      <section className="panel section-heading-row">
        <div>
          <span className="eyebrow">Analytics</span>
          <h1>Your interview performance dashboard</h1>
          <p>Track how your scores change over time and how difficulty affects your results.</p>
        </div>
        <Link to="/history" className="button button-secondary button-small">
          Open history
        </Link>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      {!analytics?.total_attempts ? (
        <EmptyState
          title="No analytics yet"
          message="Submit a few answers first and this page will start showing score trends and breakdowns."
          action={
            <Link to="/generate" className="button button-primary">
              Generate questions
            </Link>
          }
        />
      ) : (
        <>
          <section className="stats-grid">
            <StatCard label="Total attempts" value={analytics.total_attempts} tone="accent" />
            <StatCard label="Average score" value={analytics.average_score} tone="cool" />
            <StatCard label="Top score" value={analytics.top_score} tone="warm" />
            <StatCard label="Lowest score" value={analytics.lowest_score} tone="default" />
          </section>

          <section className="analytics-grid">
            <article className="panel chart-panel">
              <div className="chart-header">
                <h2>Score trend</h2>
                <p>Each point represents one evaluated answer.</p>
              </div>
              <LineChart data={analytics.timeline} />
            </article>

            <article className="panel chart-panel">
              <div className="chart-header">
                <h2>Difficulty comparison</h2>
                <p>Average score by difficulty level.</p>
              </div>
              <BarChart data={analytics.difficulty_breakdown} />
            </article>
          </section>
        </>
      )}
    </div>
  );
}
