import type { BuildDebugMetrics } from "@/components/agent-build/types";

export function BuildDebugPanel({ metrics }: { metrics: BuildDebugMetrics }) {
  return (
    <aside className="agent-debug-panel" aria-label="Agent build diagnostics">
      <header><span>BUILD ENGINE</span><strong>DEBUG</strong></header>
      <div className="agent-debug-stats">
        <span>SAMPLED WORK RATIO<strong>{metrics.workRatio.toFixed(1)}%</strong></span>
        <span>LONGEST SAMPLED GAP<strong>{Math.round(metrics.longestGap)} ms</strong></span>
        <span>IDLE VIOLATIONS<strong className={metrics.violations ? "has-violations" : ""}>{metrics.violations}</strong></span>
        <span>ACTIVE AGENTS<strong>{metrics.activeActions.length} / {metrics.workerCount}</strong></span>
        <span>PLANNED AT 1X<strong>{(metrics.plannedDurationMs / 1000).toFixed(1)} s</strong></span>
        <span>CAMERA WINDOW<strong>{metrics.activeWindow} / {metrics.windowCount}</strong></span>
      </div>
      <div className="agent-debug-action-counts">
        {Object.entries(metrics.actionCounts).map(([action, count]) => (
          <span key={action}>{action.replaceAll("_", " ")} <b>{count}</b></span>
        ))}
        <small>{metrics.sampledFrames} samples · 10Hz target</small>
      </div>
      <div className="agent-debug-actions">
        {metrics.activeActions.slice(0, 14).map(({ agentId, action, layerId }) => (
          <p key={`${agentId}-${layerId}`}>
            <b>A{String(agentId + 1).padStart(2, "0")}</b>
            <span>{action.replaceAll("_", " ")}</span>
            <small>{layerId}</small>
          </p>
        ))}
        {!metrics.activeActions.length && <p className="agent-debug-empty">No active actions</p>}
      </div>
      <footer>PROGRESS {metrics.progress.toFixed(0)}%</footer>
    </aside>
  );
}
