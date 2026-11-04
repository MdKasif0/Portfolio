/**
 * Every tunable of the Build Mode film. See components/agent-build/README.md.
 * Durations are in ms at 1x; the speed control (1x/2x/4x) scales all of them.
 */
export const buildModeConfig = {
  enabled: true,
  /** Default playback speed (desktop). The film is tuned to ~40–45s at 1x. */
  speedDefault: 1,
  mobileSpeedDefault: 2,
  /** The opening curtain: the Kasif signature draws while cursors orbit it, then they burst out as the build starts. */
  autoStartMs: 4200,
  autoDismissMs: 6000,
  runOncePerSession: false,
  soundDefault: false,
  /** Safety net: restore the live page if a build somehow runs this long. */
  hardCapMs: 180_000,
  completionStorageKey: "kasif-agent-build-complete",
  /** Seed for every random choice: the same seed plays the same film. */
  seed: 0x5eed,

  agents: {
    /** Cursors rendered at once (an agent only renders while it has a task). */
    maxVisible: 14,
    mobileMaxVisible: 8,
    /** The control bar's crew counter ramps from `rosterStart` to `rosterSize` as agents spawn. */
    rosterStart: 18,
    rosterSize: 30,
    /** Minimum gap between spawns. */
    spawnIntervalMs: 90
  },

  /** Global multiplier on every action duration (desktop) and the mobile cut. */
  tempo: 0.62,
  mobileTempo: 0.3,

  /** Per-action base durations (ms at tempo 1). */
  durations: {
    travelMin: 150,
    travelMax: 420,
    hesitationMin: 70,
    hesitationMax: 170,
    drawBoxMin: 480,
    drawBoxMax: 820,
    fill: 380,
    roundCorners: 360,
    drawTextbox: 360,
    charMin: 22,
    charMax: 42,
    punctuationPause: 120,
    resizeText: 720,
    style: 420,
    dropImage: 900,
    crop: 620,
    pickerHover: 90,
    scale: 320,
    recolor: 260,
    drawLineMin: 380,
    drawLineMax: 760,
    pasteDrag: 460,
    gradient: 620,
    stroke: 900,
    rotate: 420,
    slam: 80,
    sliderDemo: 1500,
    marquee: 700,
    stamp: 2300,
    qaCheck: 520
  },

  realism: {
    /** Chance a typed character is a typo (caught and backspaced). */
    typoRate: 1 / 40,
    /** Chance an action starts with a slip (wrong click → ⌘Z → redo). Scaled per agent style. */
    mistakeRate: 1 / 25,
    /** Chance of a 1–2px arrow-key nudge after placing a box. */
    nudgeRate: 0.18,
    /** Chance of re-selecting a typed word to fix it. */
    reselectRate: 0.08
  },

  camera: {
    /** Tasks are scheduled inside viewport ± this many screens. */
    windowMargin: 0.25,
    /** Move to the next window once this share of the current window's tasks is done. */
    advanceAt: 0.85,
    minScrollSeconds: 1.4,
    maxScrollSeconds: 2.2,
    /** New-window tasks start staggered after the scroll begins. */
    staggerMinMs: 60,
    staggerMaxMs: 120,
    /** Subtle push-in on hero moments. */
    pushIn: 1.02
  },

  hud: {
    /** Left-edge layers panel: how many recent layers it lists. */
    layersPanelRows: 9
  },

  performance: {
    /** If the smoothed frame time exceeds this, chips and sparks are trimmed. */
    frameBudgetMs: 20
  }
} as const;

export type BuildModeConfig = typeof buildModeConfig;
