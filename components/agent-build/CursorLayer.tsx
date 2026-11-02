"use client";

import type { CSSProperties } from "react";
import { Fragment } from "react";
import { AgentCursor } from "@/components/agent-build/AgentCursor";
import { BuildInspector } from "@/components/agent-build/BuildInspector";
import { WireframeBox } from "@/components/agent-build/WireframeBox";
import type { BuildFrame, CursorPosition } from "@/components/agent-build/types";

export function CursorLayer({
  visible,
  positions,
  frames,
  qualityLimited
}: {
  visible: boolean;
  positions: CursorPosition[];
  frames: BuildFrame[];
  qualityLimited: boolean;
}) {
  if (!visible) return null;
  const primaryFrame = frames[frames.length - 1] ?? null;

  return (
    <div className="agent-cursor-layer" data-quality-limited={qualityLimited} aria-hidden="true">
      {/* Active wireframe selection boxes */}
      {frames.map((frame) => {
        const rect = frame.layer.rect;
        const currentTask = frame.tasks?.find((t) => t.action === frame.activeAction);
        const style: CSSProperties = {
          left: 0,
          top: 0,
          width: rect.width,
          height: rect.height,
          transform: `translate3d(${rect.x}px, ${rect.y - window.scrollY}px, 0)`,
          "--action-progress": frame.actionProgress ?? 0,
          "--wireframe-duration": `${Math.max(400, frame.endsAt - frame.startedAt - frame.travelDuration)}ms`
        } as CSSProperties;

        return (
          <Fragment key={`${frame.cursorId}-${frame.layer.id}`}>
            <WireframeBox
              layer={frame.layer}
              style={style}
              action={frame.activeAction ?? frame.recipe[0]}
              typedText={frame.typedText ?? frame.layer.text}
              actionProgress={frame.actionProgress ?? 0}
              details={currentTask?.details}
            />
            {!qualityLimited && (
              <i
                className="agent-sparkle"
                style={{
                  left: 0,
                  top: 0,
                  transform: `translate3d(${rect.x + rect.width / 2}px, ${rect.y + rect.height / 2 - window.scrollY}px, 0)`
                }}
              />
            )}
          </Fragment>
        );
      })}

      {/* Inspector summary panel */}
      {primaryFrame && <BuildInspector frame={primaryFrame} />}

      {/* Render active cursors (only active agents on screen, NO idle cursors) */}
      {positions.map((position) =>
        position.active ? (
          <AgentCursor
            key={position.agentId}
            {...position}
          />
        ) : null
      )}
    </div>
  );
}
