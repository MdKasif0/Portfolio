"use client";

import { useEffect, useState } from "react";
import { FULL_STOP, SIGNATURE_STROKES, SIGNATURE_VIEWBOX as box, strokeOutline } from "@/components/agent-build/signature";

/** The calligraphic Kasif, finished. The path is built in the browser, because written into the page it would add about 30 KB of HTML. */
export function SignatureMark({ className = "" }: { className?: string }) {
  const [paths, setPaths] = useState<string[]>([]);
  useEffect(() => setPaths(SIGNATURE_STROKES.map((stroke) => strokeOutline(stroke, stroke.xs.length - 1))), []);
  return (
    <svg className={`signature-mark ${className}`} viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} aria-hidden="true" data-layer="image" data-kind="quote-signature">
      {paths.map((d) => <path key={d.slice(0, 24)} d={d} fill="currentColor" />)}
      <circle cx={FULL_STOP.x} cy={FULL_STOP.y} r={FULL_STOP.r} fill="#f2503e" />
    </svg>
  );
}
