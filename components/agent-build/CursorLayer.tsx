"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { buildModeConfig } from "@/components/agent-build/buildMode.config";
import { AgentCursor } from "@/components/agent-build/AgentCursor";
import { BuildInspector } from "@/components/agent-build/BuildInspector";
import { WireframeBox } from "@/components/agent-build/WireframeBox";
import type { BuildFrame, CursorPosition } from "@/components/agent-build/types";

export function CursorLayer({
  visible,
  positions,
  frame,
  typedText,
  finishing,
  speed
}: {
  visible: boolean;
  positions: CursorPosition[];
  frame: BuildFrame | null;
  typedText: string;
  finishing: boolean;
  speed: number;
}) {
  const trailRef = useRef<HTMLCanvasElement>(null);
  const trailPointsRef = useRef<Array<Array<{ x: number; y: number; at: number }>>>([]);

  useEffect(() => {
    const canvas = trailRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (window.matchMedia("(max-width: 700px)").matches) {
      trailPointsRef.current = [];
      return;
    }
    const colors = ["#22D3EE", "#F472B6", "#FB923C", "#A78BFA", "#FACC15", "#4ADE80", "#60A5FA", "#F87171"];
    const now = performance.now();
    positions.forEach((position, index) => {
      if (index >= 10 || !position.active) return;
      const points = trailPointsRef.current[index] ?? [];
      points.push({ x: position.x, y: position.y, at: now });
      while (points.length > buildModeConfig.cursorTrailLength) points.shift();
      trailPointsRef.current[index] = points;
    });
    positions.forEach((position, index) => {
      const points = trailPointsRef.current[index] ?? [];
      const color = colors[index % colors.length];
      for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
        const from = points[pointIndex - 1];
        const to = points[pointIndex];
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.strokeStyle = `${color}${Math.round(100 * (pointIndex / points.length)).toString(16).padStart(2, "0")}`;
        context.lineWidth = 0.65 + pointIndex / points.length;
        context.stroke();
      }
    });
  }, [positions]);

  if (!visible) return null;

  const rect = frame?.layer.rect;
  const wireframeStyle: CSSProperties | undefined = rect ? {
    left: rect.x,
    top: rect.y - window.scrollY,
    width: rect.width,
    height: rect.height
  } : undefined;

  return (
    <div className="agent-cursor-layer" aria-hidden="true">
      <canvas ref={trailRef} className="agent-trail-canvas" />
      {frame && wireframeStyle && (
        <WireframeBox
          layer={frame.layer}
          style={wireframeStyle}
          typedText={typedText}
          durationMs={Math.max(180, (frame.endsAt - frame.startedAt) / speed)}
        />
      )}
      {frame && <BuildInspector frame={frame} />}
      {positions.map((position, index) => (
        <AgentCursor key={index} id={index} {...position} finishing={finishing} />
      ))}
      {frame && <span className="agent-sparkle" style={{ left: rect?.x, top: (rect?.y ?? 0) - window.scrollY }} />}
    </div>
  );
}
