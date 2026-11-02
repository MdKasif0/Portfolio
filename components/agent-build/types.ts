import type { CSSProperties } from "react";

export type BuildPhase = "idle" | "scanning" | "building" | "finishing" | "done" | "skipped";
export type LayerType = "text" | "image" | "button" | "card" | "line" | "icon";

export type BuildAction =
  | "DRAW_BOX"
  | "FILL"
  | "ROUND_CORNERS"
  | "DRAW_TEXTBOX"
  | "TYPE"
  | "RESIZE_TEXT"
  | "STYLE"
  | "DROP_IMAGE"
  | "CROP"
  | "OPEN_PICKER"
  | "PICK_SYMBOL"
  | "DROP"
  | "SCALE"
  | "RECOLOR"
  | "ADD_SYMBOL"
  | "DRAW_LINE"
  | "COPY_PASTE"
  | "RETYPE"
  | "SWAP_IMAGE";

/**
 * Strict Agent States:
 * There is NO idle, wait, wander, or hover state.
 * Lifecycle: SPAWN -> TRAVEL -> ACT -> TRAVEL -> ACT ... -> EXIT
 */
export type AgentState = "spawn" | "travel" | "act" | "exit";

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

export type TaskDetails = {
  hex?: string;
  radius?: number;
  fontFamily?: string;
  initialFontSize?: number;
  finalFontSize?: number;
  weight?: string;
  tracking?: string;
  length?: number;
  gap?: number;
  keycap?: string;
  symbolGlyph?: string;
  toolShortcut?: string;
  verb: string;
  hasTypo?: boolean;
  typoIndex?: number;
  typoChar?: string;
  isMistakeRedo?: boolean;
  overshootPx?: number;
  tremorPx?: number;
  hesitationMs?: number;
};

export type BuildTask = {
  id: string;
  layerId: string;
  layer: BuildLayer;
  action: BuildAction;
  dependencies: string[];
  targetPoint: { x: number; y: number };
  dragFrom?: { x: number; y: number };
  dragTo?: { x: number; y: number };
  duration: number;
  details: TaskDetails;
  windowId: number;
  windowStartedAt: number;
  windowEndsAt: number;
  // Scheduled runtime timings (computed by scheduler)
  agentId: number;
  scheduledStart: number;
  travelStartedAt: number;
  travelDuration: number;
  actStartedAt: number;
  actEndsAt: number;
};

export type AgentSchedule = {
  agentId: number;
  name: string;
  color: string;
  spawnTime: number;
  exitTime: number;
  spawnOrigin: { x: number; y: number };
  exitTarget: { x: number; y: number };
  tasks: BuildTask[];
  windowId: number;
};

export type CursorPosition = {
  agentId: number;
  x: number;
  y: number;
  active: boolean;
  state: AgentState;
  section?: string;
  action?: BuildAction;
  layerId?: string;
  liveVerb?: string;
  color: string;
  name: string;
  violation?: boolean;
  toolShortcut?: string;
  keycap?: string;
  chipText?: string;
  chipKind?: string;
  progress?: number;
};

export type ActiveFrameState = {
  task: BuildTask;
  action: BuildAction;
  actionProgress: number;
  typedText: string;
  scaledFontSize?: number;
  ghostRadius?: number;
  ghostFillColor?: string;
  ghostCropProgress?: number;
  selectionActive: boolean;
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
  tasks?: BuildTask[];
};

export type BuildDebugMetrics = {
  workRatio: number;
  longestGap: number;
  violations: number;
  activeActions: Array<{ agentId: number; action: BuildAction; layerId: string; verb: string }>;
  workerCount: number;
  progress: number;
  plannedDurationMs: number;
  violatingAgentIds: number[];
  actionCounts: Partial<Record<BuildAction, number>>;
  activeWindow: number;
  windowCount: number;
  sampledFrames: number;
  queueDepthDistribution: Record<number, number>;
};
