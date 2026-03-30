export function LineChart({ data }) {
  if (!data.length) {
    return <p className="chart-empty">No attempts yet.</p>;
  }

  const width = 680;
  const height = 260;
  const padding = 28;
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  const points = data
    .map((item, index) => {
      const x = padding + index * stepX;
      const y = height - padding - (item.score / 10) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Score trend chart">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="axis-line" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="axis-line" />
        {[0, 5, 10].map((score) => {
          const y = height - padding - (score / 10) * (height - padding * 2);
          return (
            <g key={score}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} className="grid-line" />
              <text x={6} y={y + 4} className="axis-label">
                {score}
              </text>
            </g>
          );
        })}
        <polyline points={points} className="chart-line" />
        {data.map((item, index) => {
          const x = padding + index * stepX;
          const y = height - padding - (item.score / 10) * (height - padding * 2);
          return (
            <g key={item.attempt}>
              <circle cx={x} cy={y} r="5" className="chart-dot" />
              <text x={x} y={height - 8} textAnchor="middle" className="axis-label">
                {index + 1}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
