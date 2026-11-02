import { agentColors, agentNames } from "@/components/agent-build/buildMode.config";
import type { BuildAction, AgentState } from "@/components/agent-build/types";

export function AgentCursor({
  agentId,
  x,
  y,
  active,
  section,
  state,
  action,
  liveVerb,
  violation,
  toolShortcut,
  keycap,
  chipText,
  chipKind,
  color,
  name
}: {
  agentId: number;
  x: number;
  y: number;
  active: boolean;
  section?: string;
  state: AgentState;
  action?: BuildAction;
  liveVerb?: string;
  violation?: boolean;
  toolShortcut?: string;
  keycap?: string;
  chipText?: string;
  chipKind?: string;
  color?: string;
  name?: string;
}) {
  const agentColor = color || agentColors[agentId % agentColors.length];
  const agentName = name || (agentId < agentNames.length ? agentNames[agentId] : `agent-${agentId + 1}`);

  return (
    <span
      className={`agent-cursor${active ? " is-active" : ""}${violation ? " has-idle-violation" : ""}`}
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        color: violation ? "#F87171" : agentColor
      }}
      aria-hidden="true"
    >
      {/* 14-16px crisp arrow pointer with soft drop-shadow and glow */}
      <svg viewBox="0 0 20 24" fill="none" className="agent-cursor-svg">
        <path
          d="M2 1.5 18 14l-7 .7-3.8 6.1L2 1.5Z"
          fill="currentColor"
          stroke="#08080D"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </svg>

      {/* Floating identity badge with live verb */}
      <span className="agent-cursor-tag" style={{ borderColor: agentColor }}>
        <span className="agent-cursor-name" style={{ backgroundColor: agentColor }}>
          {agentName}
        </span>
        {active && (
          <span className="agent-cursor-status">
            {liveVerb || (action ? action.replaceAll("_", " ").toLowerCase() + "…" : "acting…")}
          </span>
        )}
      </span>

      {/* Tool shortcut badge near cursor */}
      {toolShortcut && (
        <span className="agent-cursor-tool-badge" style={{ backgroundColor: agentColor }}>
          {toolShortcut}
        </span>
      )}

      {/* Keycap Toast (⌘C, ⌘V, ⌫, ⌘Z) */}
      {keycap && (
        <span className="agent-keycap-toast">
          {keycap}
        </span>
      )}

      {/* Floating mini chip (e.g. font-size, hex, gap, qa) */}
      {chipText && (
        <span className={chipKind === "qa" ? "agent-qa-chip" : `agent-mini-chip ${chipKind ? `is-${chipKind}` : ""}`}>
          {chipText}
        </span>
      )}
    </span>
  );
}
