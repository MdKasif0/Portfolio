import type { BuildDebugMetrics } from "@/components/agent-build/types";

export function BuildDebugPanel({
  metrics,
  isTestScene = false,
  onToggleTestScene
}: {
  metrics: BuildDebugMetrics;
  isTestScene?: boolean;
  onToggleTestScene?: () => void;
}) {
  const isHealthy = metrics.workRatio >= 97 && metrics.violations === 0;

  return (
    <aside className="agent-debug-panel" aria-label="Agent build diagnostics">
      <header>
        <span>TASK ENGINE <strong>DEBUG</strong></span>
        {onToggleTestScene && (
          <button
            type="button"
            onClick={onToggleTestScene}
            style={{
              background: isTestScene ? "#3B82F6" : "rgba(255,255,255,0.12)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "4px",
              padding: "2px 6px",
              fontSize: "8px",
              cursor: "pointer"
            }}
          >
            {isTestScene ? "TEST SCENE ON" : "RUN TEST SCENE"}
          </button>
        )}
      </header>

      <div className="agent-debug-stats">
        <span>
          WORK RATIO
          <strong style={{ color: metrics.workRatio >= 97 ? "#4ADE80" : "#F87171" }}>
            {metrics.workRatio.toFixed(1)}%
          </strong>
        </span>
        <span>
          LONGEST GAP
          <strong style={{ color: metrics.longestGap <= 250 ? "#4ADE80" : "#F87171" }}>
            {Math.round(metrics.longestGap)} ms
          </strong>
        </span>
        <span>
          IDLE VIOLATIONS
          <strong className={metrics.violations ? "has-violations" : ""} style={{ color: metrics.violations === 0 ? "#4ADE80" : "#F87171" }}>
            {metrics.violations}
          </strong>
        </span>
        <span>
          ACTIVE AGENTS
          <strong>{metrics.activeActions.length} / {metrics.workerCount}</strong>
        </span>
        <span>
          PLANNED AT 1X
          <strong>{(metrics.plannedDurationMs / 1000).toFixed(1)} s</strong>
        </span>
        <span>
          CAMERA WINDOW
          <strong>{metrics.activeWindow} / {metrics.windowCount}</strong>
        </span>
      </div>

      <div className="agent-debug-action-counts">
        {Object.entries(metrics.actionCounts).map(([action, count]) => (
          <span key={action}>
            {action.replaceAll("_", " ")} <b>{count}</b>
          </span>
        ))}
        <small>{isHealthy ? "✓ Scheduler invariants met: NO IDLE CURSORS" : "Auditing invariants…"}</small>
      </div>

      <div className="agent-debug-actions">
        {metrics.activeActions.slice(0, 14).map(({ agentId, action, layerId, verb }) => (
          <p key={`${agentId}-${layerId}-${action}`}>
            <b>A{String(agentId + 1).padStart(2, "0")}</b>
            <span>{verb || action.replaceAll("_", " ")}</span>
            <small>{layerId.split(":").slice(0, 2).join(":")}</small>
          </p>
        ))}
        {!metrics.activeActions.length && <p className="agent-debug-empty">No active actions</p>}
      </div>

      <footer>
        <span>PROGRESS {metrics.progress.toFixed(0)}%</span>
        <span>STATUS: {isHealthy ? "OPTIMAL" : "ATTENTION"}</span>
      </footer>
    </aside>
  );
}
