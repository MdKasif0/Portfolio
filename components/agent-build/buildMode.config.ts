export const buildModeConfig = {
  enabled: true,
  agentCountRange: [18, 30] as const,
  speedDefault: 1,
  autoStartMs: 1200,
  autoDismissMs: 6000,
  runOncePerSession: false,
  soundDefault: false,
  sectionPauseMs: 620,
  taskDurationMs: 300,
  laneCount: 5,
  mobileAgentLimit: 10,
  mobileSpeedDefault: 2,
  mobileTimeScale: 0.53,
  productionDurationMs: 34_800,
  cursorTrailLength: 18,
  cursorSpring: 0.16,
  frameRateCap: 60,
  debugTimeline: process.env.NODE_ENV === "development",
  completionStorageKey: "kasif-agent-build-complete"
} as const;

export const agentColors = [
  "#22D3EE",
  "#F472B6",
  "#FB923C",
  "#A78BFA",
  "#FACC15",
  "#4ADE80",
  "#60A5FA",
  "#F87171"
] as const;

export const agentNames = [
  "layout-agent",
  "copy-agent",
  "visual-agent",
  "motion-agent",
  "systems-agent",
  "detail-agent"
] as const;
