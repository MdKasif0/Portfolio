/**
 * One clock drives every agent. Time advances on requestAnimationFrame, scaled by the
 * playback speed and paused while the tab is hidden, so 1x/2x/4x and skip apply to all
 * actions at once. Awaitable waits and tweens resolve inside the frame that reaches
 * them, so an agent's next action starts in the same frame its previous one ended.
 */

export class BuildAborted extends Error {
  constructor() {
    super("Build Mode stopped");
    this.name = "BuildAborted";
  }
}

type Waiter = { at: number; resolve: () => void; reject: (error: Error) => void };
type Ticker = (time: number) => void;

export class Clock {
  /** Build time in ms (speed-scaled). */
  time = 0;
  speed = 1;
  /** Real ms the clock has been running (unscaled, excludes hidden time). */
  realTime = 0;
  private waiters: Waiter[] = [];
  private tickers = new Set<Ticker>();
  private tweenRejects = new Set<(error: Error) => void>();
  private raf = 0;
  private last = 0;
  private stopped = false;
  private frameHooks: Array<(time: number, dt: number) => void> = [];

  start() {
    this.last = performance.now();
    const frame = (now: number) => {
      if (this.stopped) return;
      const dt = Math.min(64, Math.max(0, now - this.last));
      this.last = now;
      this.realTime += dt;
      this.time += dt * this.speed;
      for (const hook of this.frameHooks) hook(this.time, dt);
      for (const tick of Array.from(this.tickers)) tick(this.time);
      if (this.waiters.length) {
        const due = this.waiters.filter((waiter) => waiter.at <= this.time);
        if (due.length) {
          this.waiters = this.waiters.filter((waiter) => waiter.at > this.time);
          for (const waiter of due) waiter.resolve();
        }
      }
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  /** Called every frame before tickers (scheduler bookkeeping, rendering). */
  onFrame(hook: (time: number, dt: number) => void) {
    this.frameHooks.push(hook);
  }

  stop() {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    const pending = this.waiters;
    this.waiters = [];
    this.tickers.clear();
    const tweens = Array.from(this.tweenRejects);
    this.tweenRejects.clear();
    for (const waiter of pending) waiter.reject(new BuildAborted());
    for (const reject of tweens) reject(new BuildAborted());
  }

  get running() {
    return !this.stopped;
  }

  wait(ms: number) {
    if (this.stopped) return Promise.reject(new BuildAborted());
    if (ms <= 0) return Promise.resolve();
    return new Promise<void>((resolve, reject) => this.waiters.push({ at: this.time + ms, resolve, reject }));
  }

  /** Calls `step(progress 0..1)` every frame for `ms`, including once at 0 and once at 1. */
  tween(ms: number, step: (progress: number) => void) {
    if (this.stopped) return Promise.reject(new BuildAborted());
    const start = this.time;
    step(0);
    if (ms <= 0) {
      step(1);
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      const finish = () => {
        this.tickers.delete(ticker);
        this.tweenRejects.delete(reject);
      };
      const ticker: Ticker = (time) => {
        const progress = Math.min(1, (time - start) / ms);
        try {
          step(progress);
        } catch (error) {
          finish();
          reject(error as Error);
          return;
        }
        if (progress >= 1) {
          finish();
          resolve();
        }
      };
      this.tickers.add(ticker);
      this.tweenRejects.add(reject);
    });
  }
}

/** Deterministic PRNG (mulberry32): replays produce the same choreography. */
export function rng(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min: number, max: number) => min + (max - min) * next(),
    int: (min: number, max: number) => Math.floor(min + (max - min + 1) * next()),
    chance: (probability: number) => next() < probability,
    pick: <T,>(items: readonly T[]) => items[Math.floor(next() * items.length)]
  };
}
export type Rng = ReturnType<typeof rng>;

export const hash = (value: string) => value.split("").reduce((result, character) => (Math.imul(result, 31) + character.charCodeAt(0)) >>> 0, 2166136261);
export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
export const easeInOut = (value: number) => (value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2);
export const easeOut = (value: number) => 1 - (1 - value) ** 3;
/** Ease out with a small overshoot past 1 before settling. */
export const easeOutBack = (value: number, overshoot = 1.6) => 1 + (overshoot + 1) * (value - 1) ** 3 + overshoot * (value - 1) ** 2;
