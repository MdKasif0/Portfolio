/**
 * The task engine and director. Agents follow SPAWN → TRAVEL → ACT → TRAVEL → ACT … → EXIT;
 * there is no idle, wait or wander state anywhere in the code.
 *
 * Scheduler invariants
 * 1. Every agent tops its queue up to ≥ 2 ready tasks (remaining actions of what it holds
 *    + claimed jobs). If it can't — even by stealing an unstarted job from a busy agent —
 *    it finishes what it holds and EXITS to the nearest viewport edge.
 * 2. A cursor is drawn only while its agent holds a task; the rest of the crew waits in
 *    the tray (counted in the control bar, never drawn). A new agent spawns only when
 *    there are unclaimed ready tasks for it in the camera window (≥ 2).
 * 3. Jobs are claimed only when their dependencies are done, so a claimed task is never
 *    blocked. When an element would block, the agent gets another ready job, or a real
 *    assist (pairing type + resize, or type + style), or it exits.
 * 4. Tasks are scheduled only inside the camera window (viewport ± windowMargin screens);
 *    each window is built to `advanceAt` before the camera moves on, and the scheduler
 *    favours action families that are under-represented on screen.
 * 5. Watchdog: agent-time outside TRAVEL/ACT is measured; any gap over 250ms is a violation
 *    (logged, cursor outlined red). workRatio and longestGap are exposed in ?buildDebug=1.
 */

import { buildModeConfig } from "@/components/agent-build/buildMode.config";
import { ACTIONS, contrastOf, disposeJob, type ActionContext } from "@/components/agent-build/engine/actions";
import { Agent } from "@/components/agent-build/engine/agent";
import { BuildAborted, Clock, clamp, rng } from "@/components/agent-build/engine/clock";
import { CATEGORY, type ActionCategory, type ActionName, type BuildNode, type BuildPlan, type Job } from "@/components/agent-build/engine/compiler";
import { keepStyle, pageImageSources, rememberClass, restoreClass, reveal } from "@/components/agent-build/engine/ghost";
import { AssetTray, BatonArc, h, LayersPanel, Overlay, Shockwave } from "@/components/agent-build/engine/overlay";

const C = buildModeConfig;
const GAP_LIMIT = 250;

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

export type WindowStats = {
  index: number;
  top: number;
  actions: Partial<Record<ActionName, number>>;
  categories: Partial<Record<ActionCategory, number>>;
  peakVisible: number;
  /** Cursors on screen sampled each frame through the middle of the window's life. */
  visibleSamples: number[];
};

export type EngineMetrics = {
  workRatio: number;
  longestGap: number;
  violations: number;
  activeAgents: number;
  visibleCursors: number;
  peakAgents: number;
  crew: number;
  readyTasks: number;
  done: number;
  total: number;
  longestEmptyMs: number;
  windowIndex: number;
  cameraMoving: boolean;
  fpsAvg: number;
  frameP95: number;
  lowQualityFrames: number;
  actionCounts: Partial<Record<ActionName, number>>;
  windows: WindowStats[];
  finale: string;
  active: { agent: string; color: string; action: string; target: string; visible: boolean }[];
};

export interface EngineOptions {
  plan: BuildPlan;
  mobile: boolean;
  debug: boolean;
  printSoft: number;
  scrollTo: (target: number, durationSeconds: number, overshoot?: boolean) => void;
  /** False once the visitor has taken over the camera. */
  isTouring: () => boolean;
  /** Viewport point agents spawn from (the control bar's avatar dots). */
  spawnOrigin: () => { x: number; y: number };
  /** The control bar's Go live button (rendered during the finale). */
  goLiveButton: () => HTMLElement | null;
  onProgress: (done: number, total: number) => void;
  onCrew: (crew: number, visible: number) => void;
  onCamera: (moving: boolean) => void;
  onActivity: (activity: Activity) => void;
  onLayerDone: () => void;
  onFinale: () => void;
  onComplete: () => void;
  onError: (error: unknown) => void;
}

type Work = { job: Job; actions: ActionName[] };

type Runtime = {
  agent: Agent;
  /** Claimed work, in order. */
  queue: Work[];
  current: Work | null;
  /** True while inside a travel or an action. */
  busy: boolean;
  idleSince: number;
  busyMs: number;
  idleMs: number;
  action: ActionName | null;
  exiting: boolean;
  lead: boolean;
};

export class BuildEngine {
  readonly clock = new Clock();
  readonly overlay: Overlay;
  private runtimes = new Set<Runtime>();
  private roster = new Set<number>();
  private rosterNext = 0;
  private peak = 0;
  private done = 0;
  private lastSpawn = -1e9;
  private violations = 0;
  private longestGap = 0;
  private retiredBusy = 0;
  private retiredIdle = 0;
  private finished = false;
  private debugPanel: HTMLElement | null = null;
  private lastDebug = 0;
  private tray: AssetTray | null = null;
  private layersPanel: LayersPanel;
  private ctx: ActionContext;
  private maxAgents: number;
  private typing = new Set<Element>();
  private actionCounts: Partial<Record<ActionName, number>> = {};
  // Camera
  private cameraTop = 0;
  private cameraMovingUntil = 0;
  private windowOpenedAt = -1e9;
  private lastCameraCheck = 0;
  private windows: WindowStats[] = [];
  // Empty-screen tracking
  private emptySince = -1;
  private longestEmpty = 0;
  // Frame governor
  private frameEma = 16;
  private frames: number[] = [];
  private lowQualityFrames = 0;
  // Finale
  private finale: "none" | "qa" | "exiting" = "none";
  private pausedTracks: (() => void)[] = [];
  private finaleJobs: Job[] = [];

  constructor(private options: EngineOptions) {
    this.overlay = new Overlay(this.clock);
    this.maxAgents = options.mobile ? C.agents.mobileMaxVisible : C.agents.maxVisible;
    this.ctx = {
      clock: this.clock,
      overlay: this.overlay,
      tempo: options.mobile ? C.mobileTempo : C.tempo,
      printSoft: options.printSoft,
      typing: this.typing,
      tray: () => (this.tray ??= new AssetTray(pageImageSources()))
    };
    this.layersPanel = this.overlay.add(new LayersPanel(C.hud.layersPanelRows));
    if (options.debug) {
      this.debugPanel = h("div", "ab-debug");
      document.body.appendChild(this.debugPanel);
    }
  }

  setSpeed(speed: number) {
    this.clock.speed = speed;
  }

  start() {
    // The marquee waits for its motion agent.
    document.querySelectorAll<HTMLElement>(".collab-marquee-track").forEach((track) => {
      const restore = keepStyle(track);
      track.style.setProperty("animation-play-state", "paused");
      this.pausedTracks.push(restore);
    });
    (window as Window & { __abResumeMarquee?: () => void }).__abResumeMarquee = () => this.pausedTracks.forEach((restore) => restore());
    this.cameraTop = window.scrollY;
    this.openWindow(this.cameraTop);
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
    for (const job of [...this.options.plan.jobs, ...this.finaleJobs]) disposeJob(job, this.overlay);
    this.runtimes.clear();
    this.overlay.destroy();
    this.debugPanel?.remove();
    this.pausedTracks.forEach((restore) => restore());
    delete (window as Window & { __abResumeMarquee?: () => void }).__abResumeMarquee;
    this.restoreMain?.();
    document.querySelectorAll("[data-ab-ghost], [data-ab-ghost-layer], .ab-lights").forEach((node) => node.remove());
    document.querySelectorAll(".agent-layer-revealed").forEach((el) => el.classList.remove("agent-layer-revealed"));
  }

  private restoreMain: (() => void) | null = null;

  // ------------------------------------------------------------------------------------------
  // Camera window
  // ------------------------------------------------------------------------------------------

  private vh() {
    return window.innerHeight;
  }

  /** In the camera window (viewport ± margin), measured where the camera is heading. */
  private inWindow(job: Job) {
    if (job.primary.fixed) return true;
    const top = job.primary.doc.y, bottom = top + job.primary.doc.height, vh = this.vh();
    const margin = C.camera.windowMargin * vh;
    return bottom > this.cameraTop - margin && top < this.cameraTop + vh + margin;
  }

  private inViewport(job: Job) {
    if (job.primary.fixed) return true;
    const top = job.primary.doc.y, bottom = top + Math.min(job.primary.doc.height, this.vh());
    return bottom > window.scrollY && top < window.scrollY + this.vh();
  }

  private openWindow(top: number) {
    this.windowOpenedAt = this.clock.time;
    this.windows.push({ index: this.windows.length, top: Math.round(top), actions: {}, categories: {}, peakVisible: 0, visibleSamples: [] });
    // New-window tasks start staggered just after the scroll begins.
    const now = this.clock.time;
    let order = 0;
    for (const job of this.options.plan.jobs) {
      if (job.status !== "ready" && job.status !== "blocked") continue;
      if (!this.inWindow(job) || job.availableAt > now) continue;
      job.availableAt = now + C.camera.staggerMinMs + (order++ % 6) * ((C.camera.staggerMaxMs - C.camera.staggerMinMs) / 5);
    }
  }

  private windowProgress() {
    let total = 0, doneTasks = 0;
    const vh = this.vh();
    for (const job of this.options.plan.jobs) {
      if (job.instant || job.primary.fixed) continue;
      const center = job.primary.doc.y + Math.min(job.primary.doc.height, vh) / 2;
      if (center < this.cameraTop || center > this.cameraTop + vh) continue;
      total += job.actions.length;
      doneTasks += job.status === "done" ? job.actions.length : job.step;
    }
    return total ? doneTasks / total : 1;
  }

  /** Move to the next window once enough of this one is built (or nothing here is left to claim). */
  private lastDrift = 0;

  /** Between window moves the camera eases toward the centroid of the active tasks. */
  private drift() {
    if (this.clock.realTime - this.lastDrift < 650) return false;
    const vh = this.vh();
    const active = Array.from(this.runtimes)
      .map((runtime) => runtime.current?.job)
      .filter((job): job is Job => Boolean(job) && !job!.primary.fixed && job!.section !== "finale");
    if (active.length < 3) return false;
    const centers = active.map((job) => job.primary.doc.y + Math.min(job.primary.doc.height, vh) / 2);
    const centroid = centers.reduce((sum, value) => sum + value, 0) / centers.length;
    const topActive = Math.min(...active.map((job) => job.primary.doc.y));
    const maxScroll = document.documentElement.scrollHeight - vh;
    let desired = Math.min(centroid - vh / 2, topActive - vh * 0.04);
    desired = clamp(desired, Math.max(0, this.cameraTop - vh * 0.35), Math.min(maxScroll, this.cameraTop + vh * 0.35));
    if (Math.abs(desired - window.scrollY) < vh * 0.12) return false;
    this.lastDrift = this.clock.realTime;
    this.cameraTop = desired;
    this.options.scrollTo(desired, 1.1 / Math.max(1, this.clock.speed));
    return true;
  }

  private camera() {
    if (!this.options.isTouring()) {
      this.cameraTop = window.scrollY;
      return;
    }
    if (this.clock.time < this.cameraMovingUntil || this.clock.realTime - this.lastCameraCheck < 150) return;
    this.lastCameraCheck = this.clock.realTime;
    const vh = this.vh();
    const pending = this.options.plan.jobs.filter((job) => job.status !== "done" && !job.instant && !job.primary.fixed);
    if (!pending.length) return;
    const claimableHere = pending.some((job) => job.status === "ready" && this.inWindow(job));
    if (this.windowProgress() < C.camera.advanceAt && claimableHere) {
      this.drift();
      return;
    }
    const maxScroll = document.documentElement.scrollHeight - vh;
    const waiting = pending.filter((job) => job.status === "ready" || job.status === "blocked");
    const ahead = waiting.filter((job) => job.primary.doc.y > this.cameraTop + vh * 0.3).sort((a, b) => a.primary.doc.y - b.primary.doc.y);
    let next: number;
    if (ahead.length) {
      // Next window: around the centroid of the next batch of unstarted work, keeping its top in view,
      // and never so far that work still waiting above drops out of the window margin.
      const batch = ahead.slice(0, 24);
      const centroid = batch.reduce((sum, job) => sum + job.primary.doc.y + Math.min(job.primary.doc.height, vh) / 2, 0) / batch.length;
      const topWaiting = Math.min(...waiting.map((job) => job.primary.doc.y));
      next = Math.min(centroid - vh / 2, ahead[0].primary.doc.y - vh * 0.08, topWaiting + vh * (C.camera.windowMargin - 0.05));
    } else {
      // Leftovers: work that became ready after the camera passed it. Go back for it.
      const leftovers = waiting.filter((job) => job.status === "ready" && !this.inWindow(job));
      if (!leftovers.length || claimableHere) return;
      next = Math.min(...leftovers.map((job) => job.primary.doc.y)) - vh * 0.2;
    }
    next = clamp(next, 0, maxScroll);
    if (Math.abs(next - this.cameraTop) < 40) return;
    // The mobile cut scrolls proportionally faster.
    const seconds = clamp(C.camera.minScrollSeconds + (Math.abs(next - this.cameraTop) / vh) * 0.35, C.camera.minScrollSeconds, C.camera.maxScrollSeconds) * (this.options.mobile ? 0.65 : 1);
    const heroMoment = this.windows.length === 1;
    this.cameraTop = next;
    // The camera counts as moving for most of the scroll (build time).
    this.cameraMovingUntil = this.clock.time + seconds * 1000 * 0.8;
    this.options.scrollTo(next, seconds / Math.max(1, this.clock.speed), heroMoment);
    this.options.onCamera(true);
    this.openWindow(next);
  }

  // ------------------------------------------------------------------------------------------
  // Claiming
  // ------------------------------------------------------------------------------------------

  private claimable(job: Job) {
    return job.status === "ready" && !job.instant && job.availableAt <= this.clock.time && this.inWindow(job);
  }

  private readyTasks() {
    let tasks = 0;
    for (const job of this.options.plan.jobs) if (this.claimable(job)) tasks += job.actions.length;
    return tasks;
  }

  private queueTasks(runtime: Runtime) {
    const current = runtime.current ? runtime.current.actions.length : 0;
    return current + runtime.queue.reduce((sum, work) => sum + work.actions.length, 0);
  }

  private activeCategories() {
    const counts = new Map<ActionCategory, number>();
    for (const runtime of Array.from(this.runtimes)) {
      if (runtime.action) counts.set(CATEGORY[runtime.action], (counts.get(CATEGORY[runtime.action]) ?? 0) + 1);
    }
    return counts;
  }

  /** Nearest claimable job, favouring what is on screen and action families not on screen yet. */
  private pick(runtime: Runtime): Job | null {
    const here = runtime.agent.where();
    const active = this.activeCategories();
    let best: Job | null = null, bestScore = Infinity;
    for (const job of this.options.plan.jobs) {
      if (!this.claimable(job)) continue;
      const top = job.primary.fixed ? job.primary.doc.y : job.primary.doc.y - window.scrollY;
      const x = job.primary.doc.x + job.primary.doc.width / 2, y = top + Math.min(job.primary.doc.height, 120) / 2;
      const seen = active.get(job.category) ?? 0;
      const score = Math.hypot(x - here.x, y - here.y)
        + (this.inViewport(job) ? 0 : 520)
        + (job.rule.late ? 900 : 0)
        + Math.max(0, top) * 0.35
        - (seen === 0 ? 380 : seen === 1 ? 160 : 0);
      if (score < bestScore) { bestScore = score; best = job; }
    }
    return best;
  }

  private claim(job: Job): Work {
    job.status = "claimed";
    job.holders += 1;
    return { job, actions: job.actions.slice(job.step) };
  }

  /** Invariant 1: hold at least 2 tasks, by claiming or by stealing an unstarted job. */
  private refill(runtime: Runtime) {
    while (this.queueTasks(runtime) < 2 && this.finale === "none") {
      const job = this.pick(runtime);
      if (job) { runtime.queue.push(this.claim(job)); continue; }
      const stolen = this.steal(runtime);
      if (!stolen) break;
      runtime.queue.push(stolen);
    }
  }

  private steal(thief: Runtime): Work | null {
    let donor: Runtime | null = null;
    for (const runtime of Array.from(this.runtimes)) {
      if (runtime === thief || runtime.queue.length === 0) continue;
      if (this.queueTasks(runtime) - runtime.queue[runtime.queue.length - 1].actions.length < 2) continue;
      if (!donor || this.queueTasks(runtime) > this.queueTasks(donor)) donor = runtime;
    }
    return donor?.queue.pop() ?? null;
  }

  // ------------------------------------------------------------------------------------------
  // Agents
  // ------------------------------------------------------------------------------------------

  /** Crew shown in the control bar: ramps from rosterStart to rosterSize as agents join. */
  private crew() {
    return clamp(Math.max(C.agents.rosterStart, this.roster.size), 0, C.agents.rosterSize);
  }

  private nextRosterId() {
    const active = new Set(Array.from(this.runtimes).map((runtime) => runtime.agent.id));
    if (this.rosterNext < C.agents.rosterSize) return this.rosterNext++;
    // Everyone has joined: bring someone back from the tray.
    for (let offset = 0; offset < C.agents.rosterSize; offset += 1) {
      const id = (this.lastSpawn / 7 + offset) % C.agents.rosterSize | 0;
      if (!active.has(id)) return id;
    }
    return 0;
  }

  private spawn(first?: Work, from?: { x: number; y: number }) {
    const id = this.nextRosterId();
    this.roster.add(id);
    const origin = from ?? this.options.spawnOrigin();
    const agent = new Agent(id, rng(C.seed + id * 7919 + this.peak * 31), this.clock, this.overlay, origin);
    agent.tempo = this.ctx.tempo;
    const runtime: Runtime = { agent, queue: first ? [first] : [], current: null, busy: true, idleSince: this.clock.realTime, busyMs: 0, idleMs: 0, action: null, exiting: false, lead: false };
    agent.avoid = () => Array.from(this.typing).filter((el) => runtime.current?.job.primary.el !== el).map((el) => this.overlay.rect(el));
    this.overlay.add(agent);
    this.runtimes.add(runtime);
    this.refill(runtime);
    this.peak = Math.max(this.peak, this.runtimes.size);
    this.emitCrew();
    void this.run(runtime);
    return runtime;
  }

  private emitCrew() {
    this.options.onCrew(this.crew(), this.runtimes.size);
  }

  /** A helper takes the rest of an element (pairing or baton pass). */
  private handOff(owner: Runtime, job: Job, actions: ActionName[], baton: boolean) {
    if (this.runtimes.size >= this.maxAgents || !actions.length || this.finale !== "none") return null;
    job.holders += 1;
    const start = owner.agent.where();
    const helper = this.spawn({ job, actions }, baton ? { x: start.x + 24, y: start.y + 26 } : undefined);
    if (baton) this.overlay.flash(new BatonArc(() => owner.agent.where(), () => helper.agent.where(), owner.agent.color), 520);
    return helper;
  }

  private async run(runtime: Runtime) {
    const { agent } = runtime;
    let first = true;
    try {
      while (true) {
        this.refill(runtime);
        const work = runtime.queue.shift();
        if (!work) break;
        runtime.current = work;
        const { job } = work;
        if (job.status !== "done") job.status = "active";
        while (work.actions.length) {
          const action = work.actions[0];
          // Real assists: a second agent resizes while this one types; or takes the styling.
          if (action === "TYPE" && job.rule.pair === "resize" && work.actions[1] === "RESIZE_TEXT") {
            if (this.handOff(runtime, job, work.actions.slice(1), false)) work.actions.splice(1);
          } else if ((action === "STYLE" || action === "GRADIENT") && job.rule.pair === "style" && runtime.queue.length && agent.rng.chance(0.6)) {
            if (this.handOff(runtime, job, [...work.actions], true)) { work.actions.length = 0; break; }
          } else if (work.actions.length >= 2 && runtime.queue.length && this.clock.time - this.windowOpenedAt < 1200 && !this.inViewport(job) && agent.rng.chance(0.5)) {
            // Baton pass: the window just moved on while this element is still in progress.
            if (this.handOff(runtime, job, [...work.actions], true)) { work.actions.length = 0; break; }
          }
          runtime.action = action;
          this.countAction(action);
          this.options.onActivity({
            agent: agent.name, color: agent.color, action, layerKind: job.primary.layerKind, text: job.primary.text,
            width: job.primary.doc.width, height: job.primary.doc.height, section: job.primary.section
          });
          if (first) agent.setState("spawn");
          first = false;
          runtime.busy = true;
          await ACTIONS[action](agent, job, this.ctx);
          // Between tasks the agent is not working: the watchdog times this until the next starts.
          runtime.busy = false;
          work.actions.shift();
          job.step += 1;
          if (job.step - 1 === job.unlockAfter && job.step < job.actions.length) this.promote(job);
          this.refill(runtime);
        }
        job.holders -= 1;
        if (job.holders <= 0 && job.step >= job.actions.length && job.section !== "finale") this.complete(job);
        runtime.current = null;
        if (this.finale === "exiting") break;
      }
      runtime.exiting = true;
      runtime.action = null;
      runtime.busy = true;
      await this.exit(runtime);
    } catch (error) {
      if (!(error instanceof BuildAborted)) this.options.onError(error);
    }
  }

  private countAction(action: ActionName) {
    this.actionCounts[action] = (this.actionCounts[action] ?? 0) + 1;
    const win = this.windows[this.windows.length - 1];
    if (win) {
      win.actions[action] = (win.actions[action] ?? 0) + 1;
      win.categories[CATEGORY[action]] = (win.categories[CATEGORY[action]] ?? 0) + 1;
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
    this.emitCrew();
  }

  // ------------------------------------------------------------------------------------------
  // Jobs
  // ------------------------------------------------------------------------------------------

  /** Early unlock: show the real frame now so its children can start; finish styling in place. */
  private promote(job: Job) {
    const ghost = (job.state as { ghost?: { remove(): void } }).ghost;
    const el = job.primary.el;
    if (el instanceof HTMLElement && job.actions.slice(job.step).includes("ROUND_CORNERS")) {
      (job.state as Record<string, unknown>).restoreStyle = keepStyle(el);
      el.style.setProperty("border-radius", "0px", "important");
    }
    reveal([el], this.options.plan.inertBefore);
    ghost?.remove();
    (job.state as Record<string, unknown>).ghost = undefined;
    (job.state as Record<string, unknown>).promoted = true;
    this.unblock(job);
  }

  private unblock(job: Job) {
    for (const dependent of Array.from(job.dependents)) {
      dependent.deps.delete(job);
      if (!dependent.deps.size && dependent.status === "blocked") {
        dependent.status = "ready";
        // Unlocked work starts just after, so new tasks appear staggered rather than all at once.
        dependent.availableAt = this.clock.time + C.camera.staggerMinMs;
      }
    }
  }

  private complete(job: Job) {
    ((job.state as Record<string, unknown>).restoreStyle as (() => void) | undefined)?.();
    disposeJob(job, this.overlay);
    reveal(job.nodes.map((node) => node.el), this.options.plan.inertBefore);
    job.status = "done";
    this.done += job.nodes.length;
    this.unblock(job);
    if (!job.instant && job.nodes.length) {
      this.options.onLayerDone();
      this.layersPanel.push(layerName(job.primary));
    }
    if (job.rule.flash) this.flashCards(job.nodes.map((node) => node.el).filter((el) => el.getAttribute("data-layer") === "card"));
    if (job.rule.hero) this.pushIn();
    this.options.onProgress(this.done, this.options.plan.total);
  }

  /** Coral outline flash the first time a card completes (class removed again after). */
  private flashCards(elements: Element[]) {
    elements.forEach((el) => { rememberClass(el); el.classList.add("agent-layer-revealed"); });
    const done = () => elements.forEach((el) => { el.classList.remove("agent-layer-revealed"); restoreClass(el); });
    this.clock.wait(520).then(done, done);
  }

  /** Subtle camera push-in on hero moments (transform only: no layout shift). */
  private pushIn() {
    const main = document.querySelector<HTMLElement>("main");
    if (!main || this.options.mobile) return;
    if (this.restoreMain) return;
    this.restoreMain = keepStyle(main);
    main.style.transformOrigin = `50% ${window.scrollY + window.innerHeight / 2}px`;
    main.style.transition = "transform 700ms cubic-bezier(.2,.7,.2,1)";
    main.style.transform = `scale(${C.camera.pushIn})`;
    const settle = () => { this.restoreMain?.(); this.restoreMain = null; };
    this.clock.wait(900).then(() => {
      main.style.transform = "";
      this.clock.wait(800).then(settle, settle);
    }, settle);
  }

  // ------------------------------------------------------------------------------------------
  // Finale: QA checks, a hover once, then the lead agent clicks Go live
  // ------------------------------------------------------------------------------------------

  private adHoc(el: HTMLElement, actions: ActionName[], kind: string): Job {
    const rect = el.getBoundingClientRect();
    const node: BuildNode = {
      id: `finale-${kind}-${this.finaleJobs.length}`, el, kind: "text", layerKind: kind, section: "finale", sectionIndex: 99, order: 0, depth: 0,
      parent: null, children: [], doc: { x: rect.left, y: rect.top + window.scrollY, width: rect.width, height: rect.height }, fixed: false,
      text: (el.innerText || "").trim().slice(0, 40),
      style: { fontSize: 0, family: "", weight: "", color: "", tracking: "", radius: 0, background: "", hasBackground: false, mixedColors: [] },
      instant: false, absorbed: false, rule: {}, job: null
    };
    const job: Job = {
      id: node.id, primary: node, nodes: [], actions, step: 0, deps: new Set(), dependents: new Set(), status: "claimed", instant: false, copy: null,
      seed: this.finaleJobs.length * 97, section: "finale", sectionIndex: 99, state: {}, unlockAfter: actions.length, rule: {}, category: "style", holders: 1, availableAt: 0
    };
    this.finaleJobs.push(job);
    return job;
  }

  private startFinale() {
    this.finale = "qa";
    this.layersPanel.fade();
    this.options.onFinale();
    const vh = window.innerHeight;
    const visible = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 20 && r.height > 8 && r.top > 40 && r.bottom < vh - 100; };
    const candidates = Array.from(document.querySelectorAll<HTMLElement>("[data-layer='text'], [data-layer='button']"))
      .filter((el) => !el.closest("[data-ab-ghost]") && visible(el) && (el.innerText || "").trim().length > 2);
    const step = Math.max(1, Math.floor(candidates.length / 4));
    const picks = candidates.filter((_, index) => index % step === 0).slice(0, 4);
    picks.forEach((el, index) => {
      const runtime = this.reuseOrSpawn({ job: this.adHoc(el, ["QA_CHECK"], "qa"), actions: ["QA_CHECK"] });
      if (index === 0 && runtime) runtime.lead = true;
    });
    const band = document.querySelector<HTMLElement>(".hwf-mark");
    if (band && band.getBoundingClientRect().top < vh) this.reuseOrSpawn({ job: this.adHoc(band, ["HOVER_PLAY"], "hover"), actions: ["HOVER_PLAY"] });
    // The lead agent goes live after its check.
    const button = this.options.goLiveButton();
    if (!button) {
      // No control bar on screen (dismissed): go live on our own once the checks have run.
      this.clock.wait(1600).then(() => this.goLive({ x: window.innerWidth / 2, y: window.innerHeight - 40 }), () => undefined);
    } else {
      const work: Work = { job: this.adHoc(button, ["GO_LIVE"], "go-live"), actions: ["GO_LIVE"] };
      const leader = Array.from(this.runtimes).find((runtime) => runtime.lead);
      if (leader) leader.queue.push(work);
      else this.reuseOrSpawn(work);
    }
  }

  private reuseOrSpawn(work: Work) {
    const free = Array.from(this.runtimes).find((runtime) => !runtime.exiting && runtime.queue.length === 0 && !runtime.lead);
    if (free) { free.queue.push(work); return free; }
    // Finale agents may exceed the build cap briefly; they are few and leave right after.
    return this.spawnFinale(work);
  }

  private spawnFinale(work: Work) {
    const runtime = this.spawn(work);
    return runtime;
  }

  /** Go live was clicked (by the lead agent or the visitor): shockwave, lights on, everyone exits. */
  goLive(point: { x: number; y: number }) {
    if (this.finale === "exiting") return;
    if (this.finale === "none") this.finale = "qa";
    this.finale = "exiting";
    this.overlay.flash(new Shockwave(point), 900);
    const lights = h("div", "ab-lights");
    document.body.appendChild(lights);
    this.clock.wait(700).then(() => lights.remove(), () => lights.remove());
  }

  // ------------------------------------------------------------------------------------------
  // Frame: instant jobs, spawning, camera, finale, watchdog, governor, rendering
  // ------------------------------------------------------------------------------------------

  private frame(dt: number) {
    const { plan } = this.options;
    for (const job of plan.jobs) if (job.instant && job.status === "ready") this.complete(job);

    // Quality governor: trim optional chrome (tool rows, sparks, sweeps) when frames run long.
    this.frameEma = this.frameEma * 0.9 + dt * 0.1;
    this.frames.push(dt);
    if (this.frames.length > 6000) this.frames.shift();
    this.overlay.lowQuality = this.frameEma > C.performance.frameBudgetMs;
    if (this.overlay.lowQuality) this.lowQualityFrames += 1;

    const remaining = plan.jobs.some((job) => job.status !== "done");
    if (!remaining) {
      if (this.finale === "none") this.startFinale();
      if (this.finale === "exiting" && this.runtimes.size === 0 && !this.finished) {
        this.finished = true;
        this.renderDebug(true);
        this.options.onComplete();
      }
    } else {
      // Invariant 2: spawn only when there are unclaimed ready tasks for the newcomer.
      const ready = this.readyTasks();
      if (this.runtimes.size < this.maxAgents && ready >= 2 && this.clock.time - this.lastSpawn > C.agents.spawnIntervalMs) {
        this.lastSpawn = this.clock.time;
        this.spawn();
      }
      this.camera();
    }
    if (this.cameraMovingUntil > 0 && this.clock.time >= this.cameraMovingUntil) {
      this.cameraMovingUntil = 0;
      this.options.onCamera(false);
    }

    // Watchdog (real time, unscaled).
    let visible = 0;
    const vw = window.innerWidth, vh = window.innerHeight;
    for (const runtime of Array.from(this.runtimes)) {
      const point = runtime.agent.where();
      if (point.x >= -4 && point.x <= vw && point.y >= -4 && point.y <= vh) visible += 1;
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
    // Never an empty screen for long while building.
    if (remaining) {
      if (visible === 0) {
        if (this.emptySince < 0) this.emptySince = this.clock.realTime;
        this.longestEmpty = Math.max(this.longestEmpty, this.clock.realTime - this.emptySince);
      } else this.emptySince = -1;
      const win = this.windows[this.windows.length - 1];
      if (win) {
        win.peakVisible = Math.max(win.peakVisible, visible);
        win.visibleSamples.push(visible);
      }
    }

    this.overlay.render();
    if (this.debugPanel && this.clock.realTime - this.lastDebug > 100) {
      this.lastDebug = this.clock.realTime;
      this.renderDebug(false);
    }
  }

  metrics(): EngineMetrics {
    let busy = this.retiredBusy, idle = this.retiredIdle;
    for (const runtime of Array.from(this.runtimes)) { busy += runtime.busyMs; idle += runtime.idleMs; }
    const sorted = [...this.frames].sort((a, b) => a - b);
    const avg = this.frames.length ? this.frames.reduce((sum, value) => sum + value, 0) / this.frames.length : 16.7;
    const vw = window.innerWidth, vh = window.innerHeight;
    const active = Array.from(this.runtimes).map((runtime) => {
      const point = runtime.agent.where();
      return {
        agent: runtime.agent.name,
        color: runtime.agent.color,
        action: runtime.exiting ? "EXIT" : runtime.action ?? "SPAWN",
        target: runtime.current ? `${runtime.current.job.primary.layerKind}${runtime.current.job.primary.text ? ` "${runtime.current.job.primary.text.slice(0, 18)}"` : ""}` : "",
        visible: point.x >= -4 && point.x <= vw && point.y >= -4 && point.y <= vh
      };
    });
    return {
      workRatio: busy + idle > 0 ? busy / (busy + idle) : 1,
      longestGap: this.longestGap,
      violations: this.violations,
      activeAgents: this.runtimes.size,
      visibleCursors: active.filter((item) => item.visible).length,
      peakAgents: this.peak,
      crew: this.crew(),
      readyTasks: this.readyTasks(),
      done: this.done,
      total: this.options.plan.total,
      longestEmptyMs: Math.round(this.longestEmpty),
      windowIndex: this.windows.length - 1,
      cameraMoving: this.cameraMovingUntil > this.clock.time,
      fpsAvg: Math.round(1000 / avg),
      frameP95: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 16),
      lowQualityFrames: this.lowQualityFrames,
      actionCounts: { ...this.actionCounts },
      windows: this.windows,
      finale: this.finale,
      active
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
        <div><dt>cursors</dt><dd>${m.visibleCursors} on screen · ${m.activeAgents} active</dd></div>
        <div><dt>crew</dt><dd>${m.crew} · peak ${m.peakAgents}</dd></div>
        <div><dt>window</dt><dd>#${m.windowIndex}${m.cameraMoving ? " ↓" : ""}</dd></div>
        <div><dt>empty max</dt><dd class="${m.longestEmptyMs <= 400 ? "ok" : "bad"}">${m.longestEmptyMs}ms</dd></div>
        <div><dt>fps</dt><dd>${m.fpsAvg} · p95 ${m.frameP95}ms</dd></div>
        <div><dt>ready tasks</dt><dd>${m.readyTasks}</dd></div>
        <div><dt>layers</dt><dd>${m.done} / ${m.total}</dd></div>
      </dl>
      <ul>${rows}</ul>`;
  }
}

/** A readable layer name for the layers panel. */
function layerName(node: BuildNode) {
  const kind = node.layerKind.replace(/-/g, " ");
  const text = node.text.replace(/\s+/g, " ").trim().slice(0, 16);
  return text ? `${kind} · ${text}` : kind;
}
