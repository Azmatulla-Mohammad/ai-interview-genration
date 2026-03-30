export function StatCard({ label, value, tone = "default" }) {
  return (
    <article className={`stat-card stat-card-${tone}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
    </article>
  );
}
