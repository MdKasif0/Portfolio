import type { CSSProperties } from "react";

export type BuildPhase = "idle" | "scanning" | "building" | "finishing" | "done" | "skipped";
export type LayerType = "text" | "image" | "button" | "card" | "line" | "icon";
export type BuildAction =
  | "DRAW_BOX" | "FILL" | "ROUND_CORNERS" | "DRAW_TEXTBOX" | "TYPE"
  | "RESIZE_TEXT" | "STYLE" | "DROP_IMAGE" | "CROP" | "OPEN_PICKER"
  | "PICK_SYMBOL" | "DROP" | "SCALE" | "RECOLOR" | "ADD_SYMBOL"
  | "DRAW_LINE" | "COPY_PASTE" | "RETYPE" | "SWAP_IMAGE";

export type BuildLayer = {
  id: string;
  element: HTMLElement;
  type: LayerType;
  section: string;
  windowId: number;
  index: number;
  parentId: string | null;
  depth: number;
  text: string;
  imageSrc: string;
  rect: { x: number; y: number; width: number; height: number };
  textStyle: {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    letterSpacing: string;
    color: string;
    textAlign: CSSProperties["textAlign"];
    borderRadius: string;
    backgroundColor: string;
    backgroundImage: string;
    border: string;
    objectFit: string;
  };
};

export type CursorPosition = {
  x: number;
  y: number;
  active: boolean;
  phase: "travel" | "act" | "exit";
  section?: string;
  action?: BuildAction;
  layerId?: string;
  violation?: boolean;
  nudge?: number;
};
export type BuildFrame = {
  layer: BuildLayer;
  cursorId: number;
  startedAt: number;
  endsAt: number;
  travelDuration: number;
  actionDurations: number[];
  recipe: BuildAction[];
  activeAction?: BuildAction;
  actionProgress?: number;
  typedText?: string;
  act?: "scan" | "blueprint" | "build" | "polish" | "finale" | "handoff";
  seed?: number;
  windowId: number;
  windowStartedAt: number;
  windowEndsAt: number;
  previousLayer: BuildLayer | null;
};

export type BuildDebugMetrics = {
  workRatio: number;
  longestGap: number;
  violations: number;
  activeActions: Array<{ agentId: number; action: BuildAction; layerId: string }>;
  workerCount: number;
  progress: number;
  plannedDurationMs: number;
  violatingAgentIds: number[];
  actionCounts: Partial<Record<BuildAction, number>>;
  activeWindow: number;
  windowCount: number;
  sampledFrames: number;
};
