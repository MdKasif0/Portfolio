export function LayerProgressPanel({ names, visible }: { names: string[]; visible: boolean }) {
  if (!visible || !names.length) return null;
  return (
    <aside className="agent-layer-panel" aria-hidden="true">
      {names.map((name, index) => (
        <p key={index}><span>{name || "Layer"}</span><b>✓</b></p>
      ))}
    </aside>
  );
}
