import { nodeKindLabels, type Diagram, type NodeKind, type SystemFact } from "@/data/systems";

/** A system's request path: left to right on wide screens, top to bottom on phones. Stacked nodes run in parallel. */
export function ArchitectureDiagram({ diagram, label }: { diagram: Diagram; label: string }) {
  const kinds = Array.from(new Set(diagram.columns.flat().map((node) => node.kind))) as NodeKind[];
  return (
    <figure className="arch-figure" data-layer="card" data-kind="arch-diagram">
      <ol className="arch-flow" aria-label={label} style={{ "--arch-columns": diagram.columns.length } as React.CSSProperties}>
        {diagram.columns.map((column, index) => (
          <li className={`arch-step${column.length > 1 ? " is-parallel" : ""}`} key={column[0].title}>
            {column.map((node) => (
              <div className={`arch-node is-${node.kind}`} key={node.title} data-layer="card" data-kind="arch-node">
                <span className="arch-node-kind" data-layer="text">{nodeKindLabels[node.kind]}</span>
                <strong data-layer="text">{node.title}</strong>
                <p data-layer="text">{node.note}</p>
              </div>
            ))}
            {index < diagram.columns.length - 1 && <i className="arch-link" aria-hidden="true" style={{ "--arch-delay": `${index * 0.45}s` } as React.CSSProperties} />}
          </li>
        ))}
      </ol>
      <figcaption className="arch-legend">
        {kinds.map((kind) => <span className={`arch-legend-item is-${kind}`} key={kind} data-layer="text">{nodeKindLabels[kind]}</span>)}
      </figcaption>
    </figure>
  );
}

export function SystemFacts({ facts }: { facts: SystemFact[] }) {
  return (
    <dl className="arch-facts">
      {facts.map((fact) => (
        <div className="arch-fact" key={fact.label} data-layer="card" data-kind="arch-fact">
          <dd data-layer="text">{fact.value}</dd>
          <dt data-layer="text">{fact.label}</dt>
          <span className={`arch-source is-${fact.source === "Measured" ? "measured" : "code"}`} data-layer="text">{fact.source}</span>
        </div>
      ))}
    </dl>
  );
}
