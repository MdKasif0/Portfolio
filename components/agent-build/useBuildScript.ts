"use client";

import { useMemo } from "react";
import type { BuildFrame, BuildLayer } from "@/components/agent-build/types";

type Act = "scan" | "blueprint" | "build" | "polish" | "finale" | "handoff";

export type DirectorCue = BuildFrame & {
  act: Act;
  cue: "inspect" | "place" | "type" | "polish";
  seed: number;
};

const sectionWindows: Record<string, [number, number]> = {
  nav: [350, 1150],
  top: [1050, 6650],
  work: [6400, 15400],
  collaborators: [14800, 17800],
  recognition: [17000, 21100],
  "raw-real": [20700, 23400],
  about: [23000, 27200],
  journey: [26700, 30900],
  contact: [30400, 33400],
  footer: [32900, 36900]
};

const hash = (value: string) => value.split("").reduce((result, character) =>
  (result * 31 + character.charCodeAt(0)) >>> 0, 2166136261);

function actFor(section: string, start: number, mobile: boolean): Act {
  const scale = mobile ? 0.53 : 1;
  if (start < 1_500 * scale) return "scan";
  if (section === "top" || section === "nav") return "blueprint";
  if (start < 23_000 * scale) return "build";
  if (start < 31_000 * scale) return "polish";
  if (start < 34_900 * scale) return "finale";
  return "handoff";
}

function cueFor(layer: BuildLayer, seed: number): DirectorCue["cue"] {
  if (layer.type === "image" || layer.type === "card") return "place";
  if (layer.type === "line" || layer.type === "icon") return "polish";
  return seed % 5 === 0 ? "inspect" : "type";
}

/**
 * A deterministic six-act director. Each section owns a fixed time window, while
 * layer and agent assignment are seeded so Replay produces the same choreography.
 */
export function useBuildScript(layers: BuildLayer[], cursorLimit: number, mobile = false) {
  return useMemo(() => {
    if (!layers.length || !cursorLimit) return [];
    const timeScale = mobile ? 0.53 : 1;
    const bySection = new Map<string, BuildLayer[]>();
    for (const layer of layers) {
      const sectionLayers = bySection.get(layer.section) ?? [];
      sectionLayers.push(layer);
      bySection.set(layer.section, sectionLayers);
    }

    return layers.map((layer, index) => {
      const [windowStart, windowEnd] = sectionWindows[layer.section] ?? [0, 34_800];
      const sectionLayers = bySection.get(layer.section) ?? [layer];
      const position = sectionLayers.indexOf(layer);
      const spread = Math.max(0, windowEnd - windowStart - 620);
      const seed = hash(`${layer.section}:${layer.id}`);
      const jitter = (seed % 181) - 90;
      const heroLayer = layer.section === "top";
      const focusedSection = ["recognition", "raw-real", "about"].includes(layer.section);
      const startedAt = heroLayer
        ? (120 + Math.floor(position / 10) * 400) * timeScale
        : layer.section === "work"
          ? (windowStart + position * 48) * timeScale
          : focusedSection
            ? (windowStart + position * 42) * timeScale
        : Math.max(0, (windowStart + (sectionLayers.length > 1
          ? (position / (sectionLayers.length - 1)) * spread
          : spread / 2) + jitter) * timeScale);
      // The halftone wordmark is printed by one agent across most of the footer act,
      // while the others build the studio line, columns and rule above it.
      if (layer.kind === "canvas") {
        // Starts once the tour scroll has reached the footer, ends with the act.
        const printStart = (windowStart + 1300) * timeScale;
        return {
          layer,
          cursorId: cursorLimit - 1, // the print head has the last agent to itself
          startedAt: printStart,
          endsAt: (windowEnd - 100) * timeScale,
          act: actFor(layer.section, printStart, mobile),
          cue: "place" as const,
          seed
        };
      }
      const duration = (layer.type === "text" ? 640 : 510) * timeScale;
      return {
        layer,
        cursorId: heroLayer
          ? position % Math.min(cursorLimit, 10)
          : layer.section === "footer" ? seed % Math.max(1, cursorLimit - 1) : seed % cursorLimit,
        startedAt,
        endsAt: startedAt + duration,
        act: actFor(layer.section, startedAt, mobile),
        cue: cueFor(layer, seed),
        seed
      };
    }).sort((a, b) => a.startedAt - b.startedAt || a.seed - b.seed);
  }, [cursorLimit, layers, mobile]);
}
