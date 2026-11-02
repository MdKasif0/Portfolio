# Agent Build Mode — Film Director & Fine-Tuning Guide

This guide explains how to fine-tune the multi-agent UI assembly sequence (`Agent Build Mode`) across your portfolio without having to rewrite or modify the core scheduling engine.

---

## 1. Quick Config Overview

All master timings, agent limits, human error rates, and camera behaviors are consolidated in
[`components/agent-build/buildMode.config.ts`](components/agent-build/buildMode.config.ts).

```ts
export const buildModeConfig = {
  enabled: true,
  agentCountRange: [18, 30] as const, // HUD agent counter ramp (18 at start → 30 at finale)
  speedDefault: 1,                    // 1x real-time (toggleable to 2x or 4x)
  autoStartMs: 500,                   // Delay before construction begins on page load
  autoDismissMs: 6000,                // Time HUD stays on screen after sequence ends
  soundDefault: false,                // Audio feedback (click/type clicks)
  mobileAgentLimit: 8,                // Cap active cursors on mobile screens (≤ 700px)
  activeWorkerLimit: 14,              // Target concurrency on desktop (8 - 14 active cursors)
  mobileSpeedDefault: 2,              // Default mobile playback speed
  mobileTimeScale: 0.48,              // Fast 20s cut on mobile
  mobileActionTimeScale: 0.65,        // Condensed per-action durations for mobile
  productionDurationMs: 44_000,       // Target sequence runtime (~42s at 1x)
  frameRateCap: 60,                   // Rendering target frame rate
  maxRenderedCursors: 14,             // Maximum simultaneous cursors drawn to DOM
  mobileRenderedCursors: 8,
  windowHeightFactor: 1.35,           // Viewport window culling height
  windowHandoffProgress: 1.0,         // Camera window completion threshold before advancing
  sceneStartDelayMs: 0,               // Inter-scene padding
  seed: 20261102,                     // Deterministic pseudo-random seed
  typoRate: 0.025,                    // Probability of a typing mistake (backspaced immediately)
  mistakeRate: 0.04,                  // Probability of a placement slip-up (⌘Z undo)
  qualityFrameBudgetMs: 20,           // Dropped frame throttle budget
  hesitationRangeMs: [80, 200] as const, // Per-agent decision pause range
  overshootRangePx: [2, 5] as const,  // Slight cursor overshoot before snap
  actionDurations: {
    travel: [140, 380] as const,      // Bezier travel between targets (ms)
    draw: 240,
    typePerCharacter: 26,             // Typing cadence (ms/char)
    punctuationPause: 120,            // Pause on comma/period (ms)
    style: 180,
    image: 280,
    symbol: 140
  }
};
```

---

## 2. Tuning Key Film Elements

### A. Sequence Duration & Pacing
- **To make the sequence faster or slower overall:**
  Open [`components/agent-build/actionLibrary.ts`](components/agent-build/actionLibrary.ts) and tune the multiplier in `calculateActionDuration`:
  ```ts
  const durationScale = (mobile ? buildModeConfig.mobileActionTimeScale : 1) * 1.28;
  ```
  Increasing `1.28` to `1.40` expands the 1x duration to ~46s; decreasing to `1.15` tightens it to ~37s.

- **To adjust mobile playback:**
  Modify `buildModeConfig.mobileTimeScale` (default: `0.48` for a crisp 20s cut) and `buildModeConfig.mobileActionTimeScale` (default: `0.65`).

### B. Agent Counts & Ramping
- **Control Bar Agent Display:**
  Configured in `buildModeConfig.agentCountRange: [18, 30]`.
  The control bar smoothly interpolates from 18 agents to 30 agents as the build progress rolls from 0% to 100%.
- **Active On-Screen Cursors:**
  Configured by `activeWorkerLimit: 14` (desktop) and `mobileAgentLimit: 8` (mobile).
  Agents only render a cursor when they have an active task (`TRAVEL` or `ACT`). Idle agents remain counted in the HUD tray but are never rendered on screen.

### C. Human Realism (Typos, Hesitations & ⌘Z Undos)
- **Typo Frequency:**
  Adjust `buildModeConfig.typoRate` (default: `0.025`). Agents will type 1-2 erroneous characters, pause for 120ms, backspace, and continue cleanly.
- **⌘Z Slip-Up / Undo Rate:**
  Adjust `buildModeConfig.mistakeRate` (default: `0.04`). Fast/sloppy agents will place an element 3-5px off-grid, flash a small `⌘Z` keycap chip, and snap it to the exact computed layout coordinates.
- **Micro-Nudges:**
  Slow/precise agents occasionally show small directional nudge chips (`→ 1px` or `↑ 2px`).

### D. Camera & Lenis Auto-Scroll
The auto-tour is driven by the build timeline in `components/agent-build/BuildProvider.tsx`.
- It starts at the top and advances down the page at a steady, one-way rate while the scheduled cursors build the visible layers.
- The target position is monotonic, so scene changes cannot send the camera back up; the completed tour remains at the bottom.
- Any user input takes control immediately and stops the auto-tour.

### E. Scene Scripts Reference
The build is choreographed through 7 canonical scenes in order:
1. **Hero (0–9s):** Full-width frame draw, `Anton 40 → 380` headline expansion, wine/crimson gradient handles, cutout asset drop + scanline mask, stroke reveal on "Hello, I'm", full-size typing of "KASIF.", CTA button build, stat blocks copied & retyped (3 → 18 → 10).
2. **Work Grid (9–17s):** Eyebrow & headline, card 01 crafted from scratch (frame + image + tag + title + subtitle + arrow), cloned into cards 02 & 03 with `gap 24` guides, images swapped from asset tray, coral outline flash on complete.
3. **Collab Strip (17–20s):** Logo assets dropped from tray, spacing guides aligned, motion agent drags speed handle (`1.0x`) to engage the marquee loop.
4. **Recognition (20–26s):** Big box drawn, wine gradient painted, laurel glyph dropped & scaled, giant numbers resized, award rows duplicated with red year stamps (`2024`, `2025`, `2026`).
5. **Raw → Real Slider (26–30s):** Frame draw, asset drop, split divider handle dragged across `0% → 100% → 50%` to demonstrate the before/after fidelity.
6. **About (30–36s):** Headline resize, toolkit chips fanned via copy-paste, timeline track line drawn with 5 chronological milestone nodes, quote card framed with quote glyph and signature.
7. **Journey, Contact, Footer & Finale (36–42s):** Timeline rows assembled, contact icon symbols dropped, giant "LET'S WORK TOGETHER." resized, footer wordmark stamped.
8. **The Finale:** Lead agent travels down to the control bar's **"Go live"** button and clicks it → crimson shockwave ring radiates outward, full page flashes full illumination ("lights on"), remaining agents exit, HUD reveals `Rebuilt by 30 agents in {elapsed}s · 364 layers · 0 bugs` with interactive Replay.

---

## 3. Running Verification Tests

To verify that the scheduler satisfies all strict invariants (zero idle cursors, workRatio ≥ 97%, zero violations, all 7 action types in every window):

```bash
npx tsc scripts/test-engine-invariants.ts --outDir dist-test --module commonjs --target es2022 --moduleResolution node --skipLibCheck --esModuleInterop && node dist-test/scripts/test-engine-invariants.js && rm -rf dist-test
```
