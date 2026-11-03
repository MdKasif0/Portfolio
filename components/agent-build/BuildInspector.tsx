import type { Activity } from "@/components/agent-build/engine/engine";

const actLabels: Record<string, string> = {
  scan: "01 / SCAN",
  blueprint: "02 / BLUEPRINT",
  build: "03 / BUILD",
  polish: "04 / POLISH",
  finale: "05 / FINALE",
  handoff: "06 / HANDOFF"
};

/** Live panel: the most recent action any agent started. */
export function BuildInspector({ activity, act }: { activity: Activity; act: string }) {
  return (
    <aside className="agent-inspector" aria-hidden="true">
      <div className="agent-inspector-top">
        <span><i /> AGENT BUILD / LIVE</span>
        <b>{actLabels[act] ?? actLabels.build}</b>
      </div>
      <div className="agent-inspector-target">
        <small>ACTIVE SELECTION</small>
        <strong>{activity.text.slice(0, 34) || activity.layerKind.replace(/-/g, " ").toUpperCase()}</strong>
        <span>{activity.action.replace(/_/g, " ")} · {activity.layerKind.replace(/-/g, " ").toUpperCase()}</span>
      </div>
      <div className="agent-inspector-values">
        <span>W <b>{Math.round(activity.width)} px</b></span>
        <span>H <b>{Math.round(activity.height)} px</b></span>
        <span>OP <b>100%</b></span>
      </div>
      <div className="agent-inspector-layer">
        <span className="agent-inspector-layer-dot" style={{ borderColor: activity.color }} />
        <span>{activity.agent} · {activity.section}</span>
        <span>●</span>
      </div>
    </aside>
  );
}
