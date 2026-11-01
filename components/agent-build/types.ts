import type { CSSProperties } from "react";

export type BuildPhase = "idle" | "scanning" | "building" | "finishing" | "done" | "skipped";
export type LayerType = "text" | "image" | "button" | "card" | "line" | "icon";

export type BuildLayer = {
  id: string;
  element: HTMLElement;
  type: LayerType;
  section: string;
  index: number;
  text: string;
  rect: { x: number; y: number; width: number; height: number };
  textStyle: {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    letterSpacing: string;
    color: string;
    textAlign: CSSProperties["textAlign"];
  };
};

export type CursorPosition = {
  x: number;
  y: number;
  active: boolean;
  section?: string;
  cue?: "inspect" | "place" | "type" | "polish";
};
export type BuildFrame = {
  layer: BuildLayer;
  cursorId: number;
  startedAt: number;
  endsAt: number;
  act?: "scan" | "blueprint" | "build" | "polish" | "finale" | "handoff";
  cue?: "inspect" | "place" | "type" | "polish";
  seed?: number;
};
