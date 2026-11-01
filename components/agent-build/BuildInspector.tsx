import type { BuildFrame } from "@/components/agent-build/types";

const actLabels = {
  scan: "01 / SCAN",
  blueprint: "02 / BLUEPRINT",
  build: "03 / BUILD",
  polish: "04 / POLISH",
  finale: "05 / FINALE",
  handoff: "06 / HANDOFF"
} as const;

export function BuildInspector({ frame }: { frame: BuildFrame }) {
  return (
    <aside className="agent-inspector" aria-hidden="true">
      <div className="agent-inspector-top">
        <span><i /> AGENT BUILD / LIVE</span>
        <b>{actLabels[frame.act ?? "build"]}</b>
      </div>
      <div className="agent-inspector-target">
        <small>ACTIVE SELECTION</small>
        <strong>{frame.layer.text.slice(0, 34) || frame.layer.type.toUpperCase()}</strong>
        <span>{frame.layer.section.toUpperCase()} / {frame.layer.type.toUpperCase()}</span>
      </div>
      <div className="agent-inspector-values">
        <span>W <b>{Math.round(frame.layer.rect.width)} px</b></span>
        <span>H <b>{Math.round(frame.layer.rect.height)} px</b></span>
        <span>OP <b>100%</b></span>
      </div>
      <div className="agent-inspector-layer">
        <span className="agent-inspector-layer-dot" />
        <span>{frame.layer.id.slice(0, 24)}</span>
        <span>●</span>
      </div>
    </aside>
  );
}
