export function BarChart({ data }) {
  if (!data.length) {
    return <p className="chart-empty">No difficulty data yet.</p>;
  }

  const maxValue = Math.max(...data.map((item) => item.average_score), 10);

  return (
    <div className="bar-chart">
      {data.map((item) => (
        <div key={item.difficulty} className="bar-row">
          <div className="bar-meta">
            <span>{item.difficulty}</span>
            <strong>{item.average_score.toFixed(2)}</strong>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(item.average_score / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
