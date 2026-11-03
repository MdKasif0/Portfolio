/**
 * The task engine. Agents follow SPAWN → TRAVEL → ACT → TRAVEL → ACT … → EXIT; there is
 * no idle, wait or wander state anywhere in the code.
 *
 * Scheduler invariants
 * 1. Every agent tops its queue up to ≥ 2 ready tasks (remaining actions of its current
 *    job + its claimed jobs). If it can't — even by stealing an unstarted job from a busy
 *    agent — it finishes what it holds and EXITS to the nearest viewport edge.
 * 2. A new agent spawns only when there are unclaimed ready tasks in view for it (≥ 2, so it
 *    can satisfy invariant 1 at once) — ready work beyond what active agents already hold.
 *    It flies up from the control bar's avatar dots straight to its first target.
 * 3. Jobs are claimed only when their dependencies are done, so a claimed task is never
 *    blocked: the parent frame is always built before its children.
 * 4. Work is split per element and per copy, so 8–14 agents can act in parallel in view.
 * 5. Watchdog: agent-time outside TRAVEL/ACT is measured; any gap over 250ms is a
 *    violation (logged, cursor outlined red). workRatio and longestGap are exposed.
 */

import { ACTIONS, disposeJob, type ActionContext } from "@/components/agent-build/engine/actions";
import { Agent } from "@/components/agent-build/engine/agent";
import { BuildAborted, Clock, clamp, rng } from "@/components/agent-build/engine/clock";
import type { ActionName, BuildPlan, Job } from "@/components/agent-build/engine/compiler";
import { pageImageSources, reveal } from "@/components/agent-build/engine/ghost";
import { AssetTray, h, Overlay } from "@/components/agent-build/engine/overlay";

export type Activity = {
  agent: string;
  color: string;
  action: ActionName;
  layerKind: string;
  text: string;
  width: number;
  height: number;
  section: string;
};

export type EngineMetrics = {
  workRatio: number;
  longestGap: number;
  violations: number;
  activeAgents: number;
  peakAgents: number;
  readyTasks: number;
  minQueue: number;
  done: number;
  total: number;
  active: { agent: string; color: string; action: string; target: string }[];
};

export interface EngineOptions {
  plan: BuildPlan;
  mobile: boolean;
  debug: boolean;
  printSoft: number;
  scrollTo: (target: number, durationSeconds: number) => void;
  isTouring: () => boolean;
  /** Viewport point agents spawn from (the control bar's avatar dots). */
  spawnOrigin: () => { x: number; y: number };
  onProgress: (done: number, total: number) => void;
  onAgents: (active: number, peak: number) => void;
  onActivity: (activity: Activity) => void;
  onLayerDone: () => void;
  onComplete: () => void;
  onError: (error: unknown) => void;
}

type Runtime = {
  agent: Agent;
  queue: Job[];
  current: Job | null;
  /** True while inside a travel or an action. */
  busy: boolean;
  idleSince: number;
  busyMs: number;
  idleMs: number;
  action: ActionName | null;
  exiting: boolean;
};

const GAP_LIMIT = 250;

export class BuildEngine {
  readonly clock = new Clock();
  readonly overlay: Overlay;
  private runtimes = new Set<Runtime>();
  private nextId = 0;
  private peak = 0;
  private done = 0;
  private lastSpawn = -1e9;
  private lastTour = -1e9;
  private stallSince = -1;
  private violations = 0;
  private longestGap = 0;
  private retiredBusy = 0;
  private retiredIdle = 0;
  private minQueue = Infinity;
  private finished = false;
  private debugPanel: HTMLElement | null = null;
  private lastDebug = 0;
  private tray: AssetTray | null = null;
  private ctx: ActionContext;
  private maxAgents: number;

  constructor(private options: EngineOptions) {
    this.overlay = new Overlay(this.clock);
    this.maxAgents = options.mobile ? 8 : 14;
    this.ctx = {
      clock: this.clock,
      overlay: this.overlay,
      tempo: options.mobile ? 0.65 : 1,
      printSoft: options.printSoft,
      tray: () => (this.tray ??= new AssetTray(pageImageSources()))
    };
    if (options.debug) {
      this.debugPanel = h("div", "ab-debug");
      document.body.appendChild(this.debugPanel);
    }
  }

  setSpeed(speed: number) {
    this.clock.speed = speed;
  }

  start() {
    this.clock.onFrame((_, dt) => {
      try {
        this.frame(dt);
      } catch (error) {
        this.options.onError(error);
      }
    });
    this.clock.start();
  }

  destroy() {
    this.clock.stop();
    for (const job of this.options.plan.jobs) disposeJob(job, this.overlay);
    this.runtimes.clear();
    this.overlay.destroy();
    this.debugPanel?.remove();
    document.querySelectorAll("[data-ab-ghost]").forEach((ghost) => ghost.remove());
  }

  // ------------------------------------------------------------------------------------------
  // Focus & readiness
  // ------------------------------------------------------------------------------------------

  /** Job's current viewport top (fixed elements are always in view). */
  private viewportTop(job: Job) {
    const { doc, fixed } = job.primary;
    return fixed ? doc.y : doc.y - window.scrollY;
  }

  /** In view (plus a little below the fold; more while the view has nothing left to build). */
  private inFocus(job: Job, lookahead = this.starved ? 1.6 : 1.15) {
    if (job.primary.fixed) return true;
    const top = this.viewportTop(job), bottom = top + job.primary.doc.height, vh = window.innerHeight;
    return bottom > -vh * 0.05 && top < vh * lookahead;
  }

  private starved = false;

  private claimable(job: Job, anywhere: boolean, lookahead?: number) {
    return job.status === "ready" && !job.instant && (anywhere || this.inFocus(job, lookahead));
  }

  private readyTasks() {
    let tasks = 0;
    for (const job of this.options.plan.jobs) if (this.claimable(job, !this.options.isTouring())) tasks += job.actions.length;
    return tasks;
  }

  private queueTasks(runtime: Runtime) {
    const current = runtime.current ? runtime.current.actions.length - runtime.current.step : 0;
    return current + runtime.queue.reduce((sum, job) => sum + job.actions.length, 0);
  }

  /** Nearest claimable job to the agent (top-down within view). */
  private pick(runtime: Runtime): Job | null {
    const anywhere = !this.options.isTouring();
    const here = runtime.agent.where();
    let best: Job | null = null, bestScore = Infinity;
    for (const job of this.options.plan.jobs) {
      if (!this.claimable(job, anywhere)) continue;
      const top = this.viewportTop(job);
      const x = job.primary.doc.x + job.primary.doc.width / 2, y = top + Math.min(job.primary.doc.height, 120) / 2;
      // Distance, with a pull toward the top of the page so the build reads top-down.
      const score = Math.hypot(x - here.x, y - here.y) + Math.max(0, top) * 0.6;
      if (score < bestScore) { bestScore = score; best = job; }
    }
    return best;
  }

  /** Invariant 1: hold at least 2 tasks, by claiming or by stealing an unstarted job. */
  private refill(runtime: Runtime) {
    while (this.queueTasks(runtime) < 2) {
      const job = this.pick(runtime) ?? this.steal(runtime);
      if (!job) break;
      job.status = "claimed";
      runtime.queue.push(job);
    }
    this.minQueue = Math.min(this.minQueue, this.queueTasks(runtime));
  }

  private steal(thief: Runtime): Job | null {
    let donor: Runtime | null = null;
    for (const runtime of Array.from(this.runtimes)) {
      if (runtime === thief || runtime.queue.length === 0) continue;
      if (this.queueTasks(runtime) - runtime.queue[runtime.queue.length - 1].actions.length < 2) continue;
      if (!donor || this.queueTasks(runtime) > this.queueTasks(donor)) donor = runtime;
    }
    const job = donor?.queue.pop() ?? null;
    if (job) job.status = "ready";
    return job;
  }

  // ------------------------------------------------------------------------------------------
  // Agents
  // ------------------------------------------------------------------------------------------

  private spawn() {
    const id = this.nextId++;
    const origin = this.options.spawnOrigin();
    const agent = new Agent(id, rng(0x5eed + id * 7919), this.clock, this.overlay, origin);
    this.overlay.add(agent);
    const runtime: Runtime = { agent, queue: [], current: null, busy: true, idleSince: this.clock.realTime, busyMs: 0, idleMs: 0, action: null, exiting: false };
    this.runtimes.add(runtime);
    this.refill(runtime);
    this.peak = Math.max(this.peak, this.runtimes.size);
    this.options.onAgents(this.runtimes.size, this.peak);
    void this.run(runtime);
  }

  private async run(runtime: Runtime) {
    const { agent } = runtime;
    let first = true;
    try {
      while (true) {
        this.refill(runtime);
        const job = runtime.queue.shift();
        if (!job) break;
        runtime.current = job;
        job.status = "active";
        while (job.step < job.actions.length) {
          const action = job.actions[job.step];
          runtime.action = action;
          this.options.onActivity({
            agent: agent.name,
            color: agent.color,
            action,
            layerKind: job.primary.layerKind,
            text: job.primary.text,
            width: job.primary.doc.width,
            height: job.primary.doc.height,
            section: job.primary.section
          });
          if (first) agent.setState("spawn");
          first = false;
          runtime.busy = true;
          await ACTIONS[action](agent, job, this.ctx);
          // Between tasks the agent is not working: the watchdog times this until the next starts.
          runtime.busy = false;
          if (job.step === job.unlockAfter && job.step < job.actions.length - 1) this.promote(job);
          job.step += 1;
          // Top up before the next action so the queue never drains while working.
          this.refill(runtime);
        }
        this.complete(job);
        runtime.current = null;
      }
      runtime.exiting = true;
      runtime.action = null;
      runtime.busy = true;
      await this.exit(runtime);
    } catch (error) {
      if (!(error instanceof BuildAborted)) this.options.onError(error);
    }
  }

  private async exit(runtime: Runtime) {
    const { agent } = runtime;
    agent.verb("done");
    const here = agent.where(), vw = window.innerWidth, vh = window.innerHeight;
    const edges = [
      { d: here.x, x: -40, y: here.y },
      { d: vw - here.x, x: vw + 40, y: here.y },
      { d: here.y, x: here.x, y: -40 },
      { d: vh - here.y, x: here.x, y: vh + 40 }
    ].sort((a, b) => a.d - b.d);
    await agent.travel({ el: null, x: edges[0].x, y: edges[0].y }, "exit");
    this.retire(runtime);
  }

  private retire(runtime: Runtime) {
    this.retiredBusy += runtime.busyMs;
    this.retiredIdle += runtime.idleMs;
    this.runtimes.delete(runtime);
    this.overlay.remove(runtime.agent);
    this.options.onAgents(this.runtimes.size, this.peak);
  }

  // ------------------------------------------------------------------------------------------
  // Jobs
  // ------------------------------------------------------------------------------------------

  /** Early unlock: show the real frame now so its children can start; finish styling in place. */
  private promote(job: Job) {
    const ghost = (job.state as { ghost?: { remove(): void } }).ghost;
    const el = job.primary.el;
    if (el instanceof HTMLElement && job.actions.slice(job.step + 1).includes("ROUND_CORNERS")) el.style.setProperty("border-radius", "0px", "important");
    reveal([el], this.options.plan.inertBefore);
    ghost?.remove();
    (job.state as Record<string, unknown>).ghost = undefined;
    (job.state as Record<string, unknown>).promoted = true;
    this.unblock(job);
  }

  private unblock(job: Job) {
    for (const dependent of Array.from(job.dependents)) {
      dependent.deps.delete(job);
      if (!dependent.deps.size && dependent.status === "blocked") dependent.status = "ready";
    }
  }

  private complete(job: Job) {
    if ((job.state as Record<string, unknown>).promoted && job.primary.el instanceof HTMLElement) job.primary.el.style.removeProperty("border-radius");
    disposeJob(job, this.overlay);
    reveal(job.nodes.map((node) => node.el), this.options.plan.inertBefore);
    job.status = "done";
    this.done += job.nodes.length;
    this.unblock(job);
    this.options.onProgress(this.done, this.options.plan.total);
    if (!job.instant) this.options.onLayerDone();
  }

  // ------------------------------------------------------------------------------------------
  // Frame: instant jobs, spawning, tour, watchdog, rendering
  // ------------------------------------------------------------------------------------------

  private frame(dt: number) {
    const { plan } = this.options;
    for (const job of plan.jobs) if (job.instant && job.status === "ready") this.complete(job);

    const remaining = plan.jobs.some((job) => job.status !== "done");
    if (!remaining) {
      if (!this.finished && this.runtimes.size === 0) {
        this.finished = true;
        this.renderDebug(true);
        this.options.onComplete();
      }
    } else {
      // Invariant 2: spawn only while ready tasks in view outnumber active agents.
      const working = Array.from(this.runtimes).filter((runtime) => !runtime.exiting).length;
      this.starved = !this.options.plan.jobs.some((job) => this.claimable(job, false, 1.15));
      const ready = this.readyTasks();
      if (this.runtimes.size < this.maxAgents && ready >= 2 && this.clock.time - this.lastSpawn > 110) {
        this.lastSpawn = this.clock.time;
        this.spawn();
      }
      this.tour(working);
    }

    // Watchdog (real time, unscaled).
    for (const runtime of Array.from(this.runtimes)) {
      if (runtime.busy) {
        runtime.busyMs += dt;
        runtime.idleSince = this.clock.realTime;
      } else {
        runtime.idleMs += dt;
        const gap = this.clock.realTime - runtime.idleSince;
        this.longestGap = Math.max(this.longestGap, gap);
        if (gap > GAP_LIMIT && !runtime.agent.violation) {
          runtime.agent.violation = true;
          this.violations += 1;
          console.error(`[build] ${runtime.agent.name} had no active task for ${Math.round(gap)}ms`);
        }
      }
    }

    this.overlay.render();
    if (this.debugPanel && this.clock.realTime - this.lastDebug > 250) {
      this.lastDebug = this.clock.realTime;
      this.renderDebug(false);
    }
  }

  /** Lenis tour: keep the build front in view, scrolling forward as the top completes. */
  private tour(working: number) {
    if (!this.options.isTouring() || this.clock.time - this.lastTour < 700) return;
    const vh = window.innerHeight;
    let topPending = Infinity, topActive = Infinity;
    for (const job of this.options.plan.jobs) {
      if (job.status === "done" || job.instant || job.primary.fixed) continue;
      if (job.status === "active") topActive = Math.min(topActive, job.primary.doc.y);
      else topPending = Math.min(topPending, job.primary.doc.y);
    }
    if (topPending === Infinity) return;
    const maxScroll = document.documentElement.scrollHeight - vh;
    // Lean forward: bring pending work into view while the topmost active job stays on screen.
    let desired = topPending - vh * (this.starved ? 0.04 : 0.1);
    if (topActive !== Infinity) desired = Math.min(desired, topActive - (this.starved ? 16 : vh * 0.06));
    desired = clamp(desired, 0, maxScroll);
    const readyInView = this.options.plan.jobs.filter((job) => this.claimable(job, false, 1.15)).length;
    const starving = readyInView < 2 && working < this.maxAgents;
    if (starving) {
      if (this.stallSince < 0) this.stallSince = this.clock.time;
    } else {
      this.stallSince = -1;
    }
    const ahead = desired - window.scrollY;
    if (ahead > vh * 0.12 || (starving && ahead > 24) || (starving && this.clock.time - this.stallSince > 700 && Math.abs(ahead) > 24)) {
      this.lastTour = this.clock.time;
      this.options.scrollTo(desired, clamp(Math.abs(ahead) / 900, 0.7, 1.4) / Math.max(1, this.clock.speed));
    }
  }

  metrics(): EngineMetrics {
    let busy = this.retiredBusy, idle = this.retiredIdle;
    for (const runtime of Array.from(this.runtimes)) { busy += runtime.busyMs; idle += runtime.idleMs; }
    return {
      workRatio: busy + idle > 0 ? busy / (busy + idle) : 1,
      longestGap: this.longestGap,
      violations: this.violations,
      activeAgents: this.runtimes.size,
      peakAgents: this.peak,
      readyTasks: this.readyTasks(),
      minQueue: this.minQueue === Infinity ? 0 : this.minQueue,
      done: this.done,
      total: this.options.plan.total,
      active: Array.from(this.runtimes).map((runtime) => ({
        agent: runtime.agent.name,
        color: runtime.agent.color,
        action: runtime.exiting ? "EXIT" : runtime.action ?? "SPAWN",
        target: runtime.current ? `${runtime.current.primary.layerKind}${runtime.current.primary.text ? ` "${runtime.current.primary.text.slice(0, 18)}"` : ""}` : ""
      }))
    };
  }

  private renderDebug(final: boolean) {
    if (!this.debugPanel) return;
    const m = this.metrics();
    (window as Window & { __buildMetrics?: EngineMetrics }).__buildMetrics = m;
    const rows = m.active.map((item) => `<li><i style="background:${item.color}"></i><b>${item.agent}</b> ${item.action.toLowerCase()} <span>${item.target.replace(/</g, "&lt;")}</span></li>`).join("");
    this.debugPanel.innerHTML = `<header>BUILD DEBUG${final ? " · DONE" : ""}</header>
      <dl>
        <div><dt>workRatio</dt><dd class="${m.workRatio >= 0.97 ? "ok" : "bad"}">${(m.workRatio * 100).toFixed(2)}%</dd></div>
        <div><dt>longestGap</dt><dd class="${m.longestGap <= GAP_LIMIT ? "ok" : "bad"}">${Math.round(m.longestGap)}ms</dd></div>
        <div><dt>violations</dt><dd class="${m.violations === 0 ? "ok" : "bad"}">${m.violations}</dd></div>
        <div><dt>agents</dt><dd>${m.activeAgents} / peak ${m.peakAgents}</dd></div>
        <div><dt>ready tasks</dt><dd>${m.readyTasks}</dd></div>
        <div><dt>layers</dt><dd>${m.done} / ${m.total}</dd></div>
      </dl>
      <ul>${rows}</ul>`;
  }
}
