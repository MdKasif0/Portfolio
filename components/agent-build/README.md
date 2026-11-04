# Agent Build Mode — tuning the film

Agent Build Mode replays the portfolio being built live by a crew of design agents. Every
cursor on screen is always doing a named action on a real element; there is no idle,
wander or decorative motion anywhere in the engine. When the film ends, the page is
exactly the normal site (same DOM, same pixels).

Run it with `?buildDebug=1` to see the scheduler's live panel (work ratio, longest gap,
violations, cursors on screen, current window, empty-screen time, fps, and every agent's
action). `?build=off` shows the finished site straight away.

## How it fits together

| File | Role |
| --- | --- |
| `BuildProvider.tsx` | Phases (scanning → building → finishing → done/skipped), control bar, skip/replay/Esc, visitor takeover, reduced motion and Motion off, `data-build` on `<html>`. |
| `engine/compiler.ts` | Turns every `[data-layer]` element into a parent-first job tree, reads each element's real styles, groups repeated items (first built, the rest copy-pasted), and gives each job a recipe. |
| `engine/scenes.ts` | **The script.** Per-`data-kind` direction: recipe, pairing, ordering, hero moments. Edit this to change how a part of the page is built. |
| `engine/engine.ts` | Scheduler and director: agents, camera windows, action-mix balancing, hand-offs, finale, watchdog, quality governor. |
| `engine/actions.ts` | The "hands": one async function per action (DRAW_BOX, TYPE, RESIZE_TEXT, COPY/PASTE, GRADIENT, STROKE, …). |
| `engine/ghost.ts` | Ghost proxies: the build plays on a clone over the hidden real element, then swaps to it with no layout shift. |
| `engine/overlay.ts` | Tool chrome: cursors, selection frames, chips, keycaps, popovers, picker, tray, layers panel, finale shockwave. |
| `buildMode.config.ts` | **Every tunable** (below). |

## Tunables (`buildMode.config.ts`)

| Setting | What it does |
| --- | --- |
| `speedDefault`, `mobileSpeedDefault` | Starting playback speed (the bar cycles 1x → 2x → 4x). The film is tuned to ~50 s at 1x. |
| `seed` | Every random choice derives from it: the same seed plays the same film. |
| `agents.maxVisible` / `mobileMaxVisible` | Cursors on screen at once (14 / 8). |
| `agents.rosterStart` / `rosterSize` | The crew counter ramps 18 → 30 as agents join from the avatar dots. |
| `tempo` / `mobileTempo` | Global multiplier on every action duration (desktop film / ~30 s mobile cut). Lower = faster. |
| `durations.*` | Base duration of each action (ms at tempo 1): travel, hesitation, box drawing, typing per character, resize, image drop, stamp, … |
| `realism.typoRate` | Chance a typed character is a typo (caught and backspaced). |
| `realism.mistakeRate` | Chance an action starts with a slip (wrong click → ⌘Z → redo). Sloppy agents double it, precise ones cut it. |
| `realism.nudgeRate`, `reselectRate` | Arrow-key 1–2 px corrections, re-selecting a word to fix it. |
| `camera.windowMargin` | Tasks are scheduled within viewport ± this many screens (0.02 keeps work on screen). The tour only travels down: it never passes unfinished work (`topClearance` is the space kept under the nav, `bottomClearance` what work must clear above the control bar before it starts). |
| `camera.advanceAt` | The camera moves to the next window when this share of the current one is built (0.85). |
| `camera.min/maxScrollSeconds` | Cinematic scroll length; `staggerMin/MaxMs` delays new-window tasks after a move; `pushIn` is the hero zoom. |
| `hud.layersPanelRows` | Rows in the left-edge layers panel. |
| `performance.frameBudgetMs` | Above this smoothed frame time the governor trims optional chrome (tool rows, sparks, sweeps). |

## Directing a scene (`engine/scenes.ts`)

```ts
"portfolio-word-fill": { recipe: ["DRAW_TEXTBOX", "TYPE", "RESIZE_TEXT", "GRADIENT"], pair: "resize", resizeFrom: 40, hero: true },
```

- `recipe` — the ordered actions for that kind (see `ActionName` in `compiler.ts`).
- `absorb` — build the subtree as one piece (a mock UI dropped in as one image).
- `container` — a wrapper with nothing of its own to draw; shown with its parent.
- `noGroup` — never copy-paste this kind; build each one.
- `pair: "resize" | "style"` — a real assist: a second agent resizes while the first types, or takes the styling.
- `resizeFrom` — the size the RESIZE_TEXT chip starts from ("Anton 40 → 380").
- `after: [kinds]` / `last` / `late` — ordering within a section / after everything / after the rest of the window.
- `hero` (camera push-in when done), `flash` (coral outline flash on completion).

`SELECTOR_RULES` covers layers without a distinctive `data-kind` (none right now), and
`EXTRA_JOBS` adds work for things that are not layers (the marquee's speed handle).

To build a new element, give it `data-layer` (`text`, `card`, `image`, `icon`, `button`, `line`)
and optionally `data-kind`; it gets the generic recipe for its type unless `scenes.ts` says otherwise.

## Adding an action

1. Add its name to `ActionName` and a family to `CATEGORY` in `compiler.ts` (used to balance what is on screen).
2. Write `async function myAction(agent, job, ctx)` in `actions.ts`: `agent.travel(...)` to the target, play the
   visuals with `ctx.clock.tween/wait` (never `setTimeout` — the clock handles speed, pause and skip), and touch only
   the job's ghost (`ghostOf(job)`) or overlay chrome. If you must touch a real element, snapshot it with `keepStyle()`
   and restore it, so the finished DOM stays identical.
3. Register it in `ACTIONS` and use it in a recipe in `scenes.ts`.

## Rules the engine keeps

- No idle state: an agent tops its queue up to ≥ 2 tasks, steals unstarted work, or exits to the nearest edge.
- A cursor is only drawn while its agent has a task; waiting crew sits in the tray (counted, not drawn).
- Jobs start only when their parents are built, so a claimed task is never blocked.
- The watchdog flags any gap over 250 ms in red and logs it (`violations` should stay 0).
- The real page never moves: ghosts are absolutely positioned, inserted where they cannot change sibling
  selectors (or detached with inline styles), and every touched attribute is restored byte-for-byte.
