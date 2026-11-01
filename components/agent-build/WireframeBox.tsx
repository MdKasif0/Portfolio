"use client";

import { useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { DimensionChip } from "@/components/agent-build/DimensionChip";
import type { BuildLayer } from "@/components/agent-build/types";

export function WireframeBox({
  layer,
  style,
  typedText,
  durationMs
}: {
  layer: BuildLayer;
  style: CSSProperties;
  typedText: string;
  durationMs: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const isImage = layer.type === "image" || layer.type === "card";

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
      className={`agent-wireframe${isImage ? " is-image" : ""}`}
      style={{ ...style, "--wireframe-duration": `${durationMs}ms` } as CSSProperties}
      aria-hidden="true"
    >
      {isImage ? (
        <span className="agent-image-placeholder">
          <svg viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2.5" width="12" height="11" rx="1" />
            <circle cx="5.5" cy="6" r="1.2" />
            <path d="m3.5 12 3.2-3.1 2.2 1.8 1.7-1.6 2 2.9" />
          </svg>
        </span>
      ) : (
        <span
          className="agent-typing-text"
          style={{
            fontFamily: layer.textStyle.fontFamily,
            fontSize: layer.textStyle.fontSize,
            fontWeight: layer.textStyle.fontWeight,
            lineHeight: layer.textStyle.lineHeight,
            letterSpacing: layer.textStyle.letterSpacing,
            textAlign: layer.textStyle.textAlign
          }}
        >
          {typedText}
          <i className="agent-ibeam" />
        </span>
      )}
      <i className="agent-handle top-left" />
      <i className="agent-handle top-right" />
      <i className="agent-handle bottom-left" />
      <i className="agent-handle bottom-right" />
      <DimensionChip width={layer.rect.width} height={layer.rect.height} />
    </div>
  );
}
