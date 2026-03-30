export function EmptyState({ title, message, action }) {
  return (
    <section className="panel empty-state">
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </section>
  );
}
