import { agentColors } from "@/components/agent-build/buildMode.config";
import type { BuildPhase } from "@/components/agent-build/types";

export function ControlBar({
  phase,
  agentCount,
  layersDone,
  layersTotal,
  speed,
  muted,
  touring,
  elapsedMs,
  directorAct,
  debug,
  timelineProgress,
  onSeek,
  onStart,
  onSkip,
  onDismiss,
  onReplay,
  onCycleSpeed,
  onToggleSound
}: {
  phase: BuildPhase;
  agentCount: number;
  layersDone: number;
  layersTotal: number;
  speed: number;
  muted: boolean;
  touring: boolean;
  elapsedMs: number;
  directorAct: string;
  debug: boolean;
  timelineProgress: number;
  onSeek: (progress: number) => void;
  onStart: () => void;
  onSkip: () => void;
  onDismiss: () => void;
  onReplay: () => void;
  onCycleSpeed: () => void;
  onToggleSound: () => void;
}) {
  const isFinished = phase === "done";
  const progress = layersTotal ? Math.min(100, (layersDone / layersTotal) * 100) : 0;
  const elapsedSeconds = (elapsedMs / 1000).toFixed(1);
  const labels = speed === 1 ? "1x" : `${speed}x`;

  return (
    <div className="agent-control-bar" role="group" aria-label="Agent Build Mode controls">
      {isFinished ? (
        <span className="agent-finished-copy">Rebuilt by {agentCount} agents in {elapsedSeconds}s</span>
      ) : (
        <div className="agent-count">
          <span className="agent-dot-cluster" aria-hidden="true">
            {agentColors.slice(0, 5).map((color) => <i key={color} style={{ backgroundColor: color }} />)}
          </span>
          <span>{agentCount} agents</span>
        </div>
      )}

      {!isFinished && (
        <div className="agent-progress" aria-label={`${layersDone} of ${layersTotal} layers`}>
          <span className="agent-progress-label">{layersDone} / {layersTotal || 364} layers</span>
          <span className="agent-progress-track"><i style={{ transform: `scaleX(${progress / 100})` }} /></span>
        </div>
      )}

      <span className={`agent-state-pill${isFinished ? " is-finished" : ""}`}>
        {isFinished ? "Built" : phase === "scanning" ? "Scanning page…" : phase === "finishing" ? "Finishing" : touring ? "Touring" : "Building"}
      </span>
      {!isFinished && phase !== "scanning" && (
        <span className="agent-act-label" aria-label={`Director act: ${directorAct}`}>
          {directorAct}
        </span>
      )}
      {!isFinished && debug && phase === "building" && (
        <label className="agent-debug-scrub">
          <span>TIME</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={Math.min(1, timelineProgress)}
            onChange={(event) => onSeek(Number(event.currentTarget.value))}
            aria-label="Scrub build timeline"
          />
        </label>
      )}

      {!isFinished && (
        <>
          {phase !== "scanning" && (
            <button type="button" className="agent-control-button" onClick={onCycleSpeed} aria-label={`Playback speed ${labels}; change speed`}>
              {labels}
            </button>
          )}
          {phase !== "scanning" && (
            <button type="button" className="agent-control-button agent-sound-button" onClick={onToggleSound} aria-label={muted ? "Enable build sounds" : "Mute build sounds"}>
              {muted ? "♫̸" : "♫"}
            </button>
          )}
          {phase === "scanning" && <button type="button" className="agent-primary-button" onClick={onStart}>Start</button>}
          <button type="button" className="agent-close-button" onClick={onSkip} aria-label="Skip Agent Build Mode">×</button>
        </>
      )}

      {isFinished && (
        <>
          <button type="button" className="agent-primary-button" onClick={onDismiss}>Go live</button>
          <button type="button" className="agent-replay-button" onClick={onReplay}>Replay</button>
        </>
      )}
    </div>
  );
}
