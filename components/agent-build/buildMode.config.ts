export const buildModeConfig = {
  enabled: true,
  agentCountRange: [18, 30] as const,
  speedDefault: 1,
  autoStartMs: 1200,
  autoDismissMs: 6000,
  runOncePerSession: false,
  soundDefault: false,
  mobileAgentLimit: 8,
  activeWorkerLimit: 9,
  mobileSpeedDefault: 2,
  mobileTimeScale: 0.95,
  mobileActionTimeScale: 0.86,
  productionDurationMs: 42_000,
  frameRateCap: 60,
  maxRenderedCursors: 14,
  mobileRenderedCursors: 8,
  windowHeightFactor: 1.35,
  windowHandoffProgress: 0.85,
  sceneStartDelayMs: 90,
  minimumSparseWindowTaskMs: 3_000,
  seed: 20261102,
  typoRate: 0.025,
  mistakeRate: 0.04,
  qualityFrameBudgetMs: 20,
  actionDurations: {
    travel: [120, 260] as const,
    draw: 190,
    typePerCharacter: 25,
    punctuationPause: 120,
    style: 145,
    image: 260,
    symbol: 120
  },
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
