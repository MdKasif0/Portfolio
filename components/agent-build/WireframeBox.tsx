"use client";

import { useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { DimensionChip } from "@/components/agent-build/DimensionChip";
import { GhostLayer } from "@/components/agent-build/GhostLayer";
import { ToolChrome } from "@/components/agent-build/ToolChrome";
import type { BuildAction, BuildLayer } from "@/components/agent-build/types";

export function WireframeBox({
  layer,
  style,
  action,
  typedText,
  actionProgress
}: {
  layer: BuildLayer;
  style: CSSProperties;
  action: BuildAction;
  typedText: string;
  actionProgress: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const isImage = layer.type === "image" || layer.type === "card";
  const drawing = action === "DRAW_BOX" || action === "DRAW_TEXTBOX" || action === "DRAW_LINE";
  const filling = action === "FILL";
  const roundCorners = action === "ROUND_CORNERS";
  const progress = Math.max(0, Math.min(1, actionProgress));
  const dimensionProgress = drawing ? progress : 1;

  useLayoutEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    node.style.animation = "none";
    void node.offsetWidth;
    node.style.animation = "";
  }, [layer.id]);

  return (
    <div
      ref={frameRef}
      className={`agent-wireframe${isImage ? " is-image" : ""}${drawing ? " is-drawing" : ""}${filling ? " is-filling" : ""}${roundCorners ? " is-rounding" : ""}`}
      data-action={action}
      style={{
        ...style,
        "--action-progress": progress,
        "--fill-color": layer.textStyle.backgroundColor,
        "--target-radius": layer.textStyle.borderRadius,
        "--draw-width": `${dimensionProgress * 100}%`,
        "--draw-height": `${dimensionProgress * 100}%`
      } as CSSProperties}
      aria-hidden="true"
    >
      <GhostLayer layer={layer} action={action} text={typedText} />
      {action === "TYPE" && <i className="agent-ibeam" />}
      <i className="agent-handle top-left" />
      <i className="agent-handle top-right" />
      <i className="agent-handle bottom-left" />
      <i className="agent-handle bottom-right" />
      <DimensionChip width={layer.rect.width * dimensionProgress} height={layer.rect.height * dimensionProgress} />
      <ToolChrome action={action} layer={layer} />
    </div>
  );
}
