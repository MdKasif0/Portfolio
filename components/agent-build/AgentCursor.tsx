import { agentColors, agentNames } from "@/components/agent-build/buildMode.config";
import type { BuildAction } from "@/components/agent-build/types";

export function AgentCursor({
  id,
  x,
  y,
  active,
  section,
  phase,
  action,
  violation,
  nudge
}: {
  id: number;
  x: number;
  y: number;
  active: boolean;
  section?: string;
  phase: "travel" | "act" | "exit";
  action?: BuildAction;
  violation?: boolean;
  nudge?: number;
}) {
  const color = agentColors[id % agentColors.length];
  const name = id < agentNames.length ? agentNames[id] : undefined;

  return (
    <span
      className={`agent-cursor${active ? " is-active" : ""}${violation ? " has-idle-violation" : ""}`}
      style={{ transform: `translate3d(${x}px, ${y}px, 0)`, color: violation ? "#F87171" : color }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 20 24" fill="none">
        <path d="M2 1.5 18 14l-7 .7-3.8 6.1L2 1.5Z" fill="currentColor" stroke="#08080D" strokeWidth="1.25" strokeLinejoin="round" />
      </svg>
      {name && (
        <span className="agent-cursor-tag" style={{ borderColor: color }}>
          <span className="agent-cursor-name" style={{ backgroundColor: color }}>{name}</span>
          {nudge && <span className="agent-cursor-nudge">→ {nudge}px</span>}
          {active && <span className="agent-cursor-status">
            {action?.replaceAll("_", " ").toLowerCase() ?? "working"} · {phase} · {section}
          </span>}
        </span>
      )}
    </span>
  );
}
