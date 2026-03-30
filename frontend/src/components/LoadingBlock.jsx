export function LoadingBlock({ label = "Loading..." }) {
  return (
    <section className="panel loading-panel">
      <div className="loader" />
      <p>{label}</p>
    </section>
  );
}
