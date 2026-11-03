export const buildModeConfig = {
  enabled: true,
  speedDefault: 2,
  autoStartMs: 1200,
  autoDismissMs: 6000,
  runOncePerSession: false,
  soundDefault: false,
  mobileSpeedDefault: 2,
  /** Safety net: restore the live page if a build somehow runs this long. */
  hardCapMs: 180_000,
  completionStorageKey: "kasif-agent-build-complete"
} as const;
