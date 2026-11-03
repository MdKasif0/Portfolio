/**
 * An agent's hands: the cursor on screen and the motion primitives every action is made
 * of. There is no idle state — an agent is always in TRAVEL (moving to its next target),
 * ACT (performing an action) or EXIT/SPAWN (entering or leaving). The scheduler reads
 * `state` for the watchdog.
 */

import { clamp, easeInOut, easeOut, lerp, type Clock, type Rng } from "@/components/agent-build/engine/clock";
import { Chip, h, type Anchor, type Decoration, type Overlay } from "@/components/agent-build/engine/overlay";

export type AgentState = "spawn" | "travel" | "act" | "exit";

export const AGENT_COLORS = ["#22D3EE", "#F472B6", "#FB923C", "#A78BFA", "#FACC15", "#4ADE80", "#60A5FA", "#F87171", "#2DD4BF", "#E879F9", "#FDBA74", "#A3E635", "#93C5FD", "#FCA5A5"] as const;
export const AGENT_NAMES = ["layout", "copy", "visual", "motion", "systems", "detail", "type", "media", "grid", "color", "icons", "polish", "spacing", "review"] as const;

export class Agent implements Decoration {
  readonly node: HTMLElement;
  private tag: HTMLElement;
  private verbNode: HTMLElement;
  anchor: Anchor;
  state: AgentState = "spawn";
  /** Last time (clock realTime) the agent was not in a working state; for the watchdog. */
  stateSince = 0;
  pressed = false;
  actions = 0;
  violation = false;
  readonly color: string;
  readonly name: string;

  constructor(readonly id: number, readonly rng: Rng, readonly clock: Clock, readonly overlay: Overlay, start: { x: number; y: number }) {
    this.color = AGENT_COLORS[id % AGENT_COLORS.length];
    this.name = `${AGENT_NAMES[id % AGENT_NAMES.length]}-agent`;
    this.node = h("span", "ab-cursor");
    this.node.style.setProperty("--agent", this.color);
    this.node.innerHTML = '<svg viewBox="0 0 16 20" fill="none"><path d="M1.5 1.2 14 11.3l-5.6.5-3 4.9L1.5 1.2Z" fill="currentColor" stroke="#08080D" stroke-width="1.1" stroke-linejoin="round"/></svg>';
    this.tag = h("span", "ab-tag");
    this.tag.append(h("b", "", this.name));
    this.verbNode = h("em", "", "joining");
    this.tag.append(this.verbNode);
    this.node.appendChild(this.tag);
    this.anchor = { el: null, x: start.x, y: start.y };
  }

  setState(state: AgentState) {
    this.state = state;
    this.stateSince = this.clock.realTime;
  }

  verb(text: string) {
    if (this.verbNode.textContent !== text) this.verbNode.textContent = text;
  }

  update(overlay: Overlay) {
    const point = overlay.point(this.anchor);
    // 0.3px hand tremor while working.
    const t = this.clock.time / 1000;
    const tremor = this.state === "act" ? 0.3 : 0;
    const x = point.x + Math.sin(t * 9.1 + this.id) * tremor;
    const y = point.y + Math.cos(t * 7.3 + this.id * 2) * tremor;
    this.node.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${this.pressed ? 0.86 : 1})`;
    this.node.classList.toggle("is-violation", this.violation);
  }

  /** Current viewport position. */
  where() {
    return this.overlay.point(this.anchor);
  }

  /**
   * TRAVEL: 150–450ms bezier with lift, then a spring arrival that overshoots 2–5px and
   * settles exactly on the target. Both ends are re-read every frame, so scrolling keeps
   * the path honest.
   */
  async travel(target: Anchor, state: AgentState = "travel") {
    this.setState(state);
    const from = { ...this.anchor };
    const startPoint = this.overlay.point(from);
    const endPoint = this.overlay.point(target);
    const distance = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
    if (distance < 1.5) {
      this.anchor = { ...target };
      this.setState("act");
      return;
    }
    const duration = clamp(150 + distance * 0.32, 150, 450);
    const overshoot = this.rng.range(2, 5);
    const lift = Math.min(90, distance * 0.18 + 12) * (this.rng.chance(0.5) ? 1 : -1);
    await this.clock.tween(duration, (raw) => {
      const a = this.overlay.point(from), b = this.overlay.point(target);
      const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1;
      const nx = -dy / length, ny = dx / length;
      // 85% of the time on the curve to just past the target, 15% settling back.
      const main = clamp(raw / 0.85), settle = clamp((raw - 0.85) / 0.15);
      const t = easeInOut(main);
      const past = { x: b.x + (dx / length) * overshoot, y: b.y + (dy / length) * overshoot };
      const cx = lerp(a.x, past.x, 0.5) + nx * lift, cy = lerp(a.y, past.y, 0.5) + ny * lift;
      let x = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * cx + t ** 2 * past.x;
      let y = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * cy + t ** 2 * past.y;
      if (settle > 0) {
        const s = easeOut(settle);
        x = lerp(past.x, b.x, s);
        y = lerp(past.y, b.y, s);
      }
      this.anchor = { el: null, x, y };
    });
    this.anchor = { ...target };
    this.setState(state === "travel" ? "act" : state);
  }

  /** Move within the current element while acting (drags, small repositioning). */
  async glide(target: Anchor, ms: number, onStep?: (progress: number) => void) {
    const from = { ...this.anchor };
    await this.clock.tween(ms, (raw) => {
      const t = easeInOut(raw);
      const a = this.overlay.point(from), b = this.overlay.point(target);
      if (target.el) {
        const rect = this.overlay.rect(target.el);
        this.anchor = { el: target.el, x: lerp(a.x, b.x, t) - rect.left, y: lerp(a.y, b.y, t) - rect.top };
      } else {
        this.anchor = { el: null, x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
      }
      onStep?.(raw);
    });
    this.anchor = { ...target };
  }

  /** 80–200ms of human hesitation, then a press. */
  async click(hold = 70) {
    await this.clock.wait(this.rng.range(80, 200));
    this.pressed = true;
    await this.clock.wait(hold);
    this.pressed = false;
  }

  async doubleClick() {
    await this.clock.wait(this.rng.range(80, 160));
    for (let index = 0; index < 2; index += 1) {
      this.pressed = true;
      await this.clock.wait(55);
      this.pressed = false;
      await this.clock.wait(60);
    }
  }

  /** Press, drag along `path`, release. */
  async drag(target: Anchor, ms: number, onStep?: (progress: number) => void) {
    await this.clock.wait(this.rng.range(80, 200));
    this.pressed = true;
    await this.glide(target, ms, onStep);
    this.pressed = false;
  }

  /** Keycap toast ("⌘C", "⌫", "T") beside the cursor, off the element being built. */
  key(label: string, avoid: Element | null, ms = 520) {
    const chip = new Chip({ ...this.anchor }, avoid, label, "key");
    this.overlay.flash(chip, ms);
  }

  /**
   * About one action in 25 starts with a slip: a click a little off, a ⌘Z, then the redo.
   * The agent is acting the whole time.
   */
  async maybeSlip(avoid: Element | null) {
    this.actions += 1;
    if (!this.rng.chance(1 / 25)) return;
    const here = this.anchor;
    const off: Anchor = { ...here, x: here.x + this.rng.range(-26, 26), y: here.y + this.rng.range(14, 24) };
    await this.glide(off, 160);
    await this.click();
    this.key("⌘Z", avoid, 600);
    await this.clock.wait(220);
    await this.glide(here, 160);
  }
}
