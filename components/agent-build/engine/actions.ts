/**
 * The action library. Each action moves the agent's cursor, plays its visuals on the
 * ghost and the tool chrome, then resolves. Actions read live rects so they stay on
 * target while the camera scrolls. Base durations live in buildModeConfig.durations and
 * are multiplied by `ctx.tempo` (desktop film or mobile cut).
 */

import { buildModeConfig } from "@/components/agent-build/buildMode.config";
import { clamp, easeInOut, easeOut, easeOutBack, lerp, type Clock } from "@/components/agent-build/engine/clock";
import type { ActionName, BuildNode, Job } from "@/components/agent-build/engine/compiler";
import type { Agent } from "@/components/agent-build/engine/agent";
import { alignGhost, createGhost, ghostChild, imageSourceOf, keepStyle, Typewriter, type Ghost } from "@/components/agent-build/engine/ghost";
import { Caret, Chip, ColorPopover, Floater, GuideLine, h, LineDraw, SelectionFrame, SymbolPicker, ToolRow, type Anchor, type AssetTray, type Decoration, type Overlay } from "@/components/agent-build/engine/overlay";

const D = buildModeConfig.durations;
const R = buildModeConfig.realism;

export interface ActionContext {
  clock: Clock;
  overlay: Overlay;
  /** Duration multiplier (desktop film or the mobile cut). */
  tempo: number;
  tray: () => AssetTray;
  /** Halftone print edge softness, mirrored from the footer component. */
  printSoft: number;
  /** Text elements currently being typed (other agents steer around them). */
  typing: Set<Element>;
}

type JobState = {
  frame?: SelectionFrame;
  ghost?: Ghost;
  typewriter?: Typewriter;
  colored?: { el: HTMLElement; color: string }[];
  copies?: Map<BuildNode, Ghost>;
  decor?: Decoration[];
  symbols?: SVGElement[];
  picker?: SymbolPicker;
  promoted?: boolean;
  rotation?: number;
};

const state = (job: Job) => job.state as JobState;
const target = (job: Job) => job.primary.el;
const ms = (ctx: ActionContext, value: number) => value * ctx.tempo;

function size(ctx: ActionContext, el: Element) {
  const rect = ctx.overlay.rect(el);
  return { width: rect.width, height: rect.height };
}

const at = (el: Element, x: number, y: number): Anchor => ({ el, x, y });

export function rgbToHex(color: string) {
  const match = /rgba?\(([^)]+)\)/.exec(color);
  if (!match) return color.startsWith("#") ? color.toUpperCase() : color;
  const [r, g, b, a] = match[1].split(",").map((part) => parseFloat(part));
  const hex = `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  return a !== undefined && a < 1 ? `${hex} ${Math.round(a * 100)}%` : hex;
}

function keep(job: Job, decoration: Decoration) {
  const s = state(job);
  (s.decor ??= []).push(decoration);
  return decoration;
}

/** The ghost for this job, created on first use with the original's styles. */
function ghostOf(job: Job, setup?: (ghost: Ghost) => void) {
  const s = state(job);
  if (!s.ghost) {
    s.ghost = createGhost(target(job));
    setup?.(s.ghost);
  }
  return s.ghost;
}

/** The element's own rotation (from its CSS transform), in degrees. */
function rotationOf(el: Element) {
  const transform = getComputedStyle(el).transform;
  if (!transform || transform === "none") return 0;
  const matrix = new DOMMatrix(transform);
  return Math.round(Math.atan2(matrix.b, matrix.a) * (180 / Math.PI) * 10) / 10;
}

/** Colourful words are applied in STYLE, one at a time; until then they wear the base colour. */
function neutraliseColours(job: Job, ghost: Ghost) {
  if (!job.primary.style.mixedColors.length || !job.actions.includes("STYLE")) return;
  const base = getComputedStyle(ghost.node).color;
  const colored: { el: HTMLElement; color: string }[] = [];
  ghost.node.querySelectorAll<HTMLElement>("*").forEach((child) => {
    if (!child.textContent?.trim() || child.closest("[data-ab-skip]")) return;
    const color = getComputedStyle(child).color;
    if (color !== base && !colored.some((item) => item.el.contains(child))) {
      colored.push({ el: child, color });
      child.style.color = base;
      child.style.webkitTextFillColor = base;
    }
  });
  state(job).colored = colored;
}

function trailingSymbolLength(job: Job) {
  if (!job.actions.includes("ADD_SYMBOL")) return 0;
  const match = /\s*[↗↑→▶↓✓+↔]\s*$/.exec(state(job).typewriter?.text ?? job.primary.text);
  return match ? match[0].length : 0;
}

async function typeInto(agent: Agent, ctx: ActionContext, typewriter: Typewriter, avoid: Element, limit = typewriter.total, fast = false) {
  const caret = ctx.overlay.add(new Caret(() => typewriter.caretRect()));
  ctx.typing.add(avoid);
  try {
    await typeChars(agent, ctx, typewriter, avoid, limit, fast);
  } finally {
    ctx.typing.delete(avoid);
    ctx.overlay.remove(caret);
  }
}

async function typeChars(agent: Agent, ctx: ActionContext, typewriter: Typewriter, avoid: Element, limit: number, fast: boolean) {
  const { clock } = ctx;
  const full = typewriter.text;
  const typed = Math.min(limit, fast ? 18 : 30);
  let burst = agent.rng.int(5, 12);
  for (let count = typewriter.shown + 1; count <= typed; count += 1) {
    const character = full[count - 1] ?? "";
    // About 1 in 40 characters is a typo, caught and backspaced at once.
    if (!fast && agent.rng.chance(R.typoRate) && /\w/.test(character)) {
      typewriter.set(count - 1, agent.rng.pick(["e", "r", "a", "s", "n", "t"]));
      await clock.wait(ms(ctx, agent.rng.range(40, 70)));
      agent.key("⌫", avoid, 380);
      typewriter.set(count - 1);
      await clock.wait(ms(ctx, agent.rng.range(70, 110)));
    }
    typewriter.set(count);
    await clock.wait(ms(ctx, agent.rng.range(fast ? 14 : D.charMin, fast ? 26 : D.charMax)));
    // Cadence: a beat after punctuation, and bursts with short pauses.
    if (/[.,!?:;·&—]/.test(character)) await clock.wait(ms(ctx, D.punctuationPause));
    else if (--burst <= 0) {
      burst = agent.rng.int(5, 12);
      await clock.wait(ms(ctx, agent.rng.range(60, 160)));
    }
  }
  // Long copy: the first line is typed, the rest flows in by lines.
  let shown = typewriter.shown;
  while (shown < limit) {
    shown = Math.min(limit, shown + Math.max(18, Math.round((limit - typed) / 3)));
    typewriter.set(shown);
    await clock.wait(ms(ctx, 100));
  }
}

/** Occasionally re-select the last word and fix it (type it again). */
async function maybeReselect(agent: Agent, ctx: ActionContext, typewriter: Typewriter, el: Element) {
  if (!agent.rng.chance(R.reselectRate)) return;
  const text = typewriter.text;
  const match = /(\w{4,})\W*$/.exec(text.slice(0, typewriter.shown));
  if (!match) return;
  const start = text.slice(0, typewriter.shown).lastIndexOf(match[1]);
  await agent.doubleClick();
  ctx.overlay.flash(new Chip(agent.anchor, el, `“${match[1]}”`, "blue"), 420);
  typewriter.set(start);
  await ctx.clock.wait(ms(ctx, 90));
  for (let count = start + 1; count <= start + match[1].length; count += 1) {
    typewriter.set(count);
    await ctx.clock.wait(ms(ctx, agent.rng.range(18, 30)));
  }
}

// ---------------------------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------------------------

async function drawBox(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const { width, height } = size(ctx, el);
  agent.verb(job.primary.kind === "image" ? "framing image" : `drawing ${Math.round(width)}×${Math.round(height)}`);
  // Full-bleed elements start at the screen edge: grab the corner a few pixels inside so the hand stays in view.
  const origin = ctx.overlay.rect(el);
  const inset = { x: origin.left < 6 ? 6 - origin.left : 0, y: origin.top < 6 ? 6 - origin.top : 0 };
  await agent.travel(at(el, inset.x, inset.y));
  await agent.maybeSlip(el);
  ctx.overlay.flash(new ToolRow(agent.anchor, el, job.primary.kind === "image" ? "I" : "R"), 700);
  const frame = new SelectionFrame(el, { left: 0, top: 0, width: 0, height: 0 }, { grid: true, size: true });
  ctx.overlay.add(frame);
  keep(job, frame);
  state(job).frame = frame;
  // Precise agents snap to a guide.
  const guide = agent.style === "precise" ? ctx.overlay.add(new GuideLine(el, "left")) : null;
  const drift = agent.rng.chance(R.nudgeRate) ? agent.rng.int(1, 2) : 0;
  const duration = clamp(D.drawBoxMin + Math.hypot(width, height) * 0.22, D.drawBoxMin, D.drawBoxMax);
  await agent.drag(at(el, width + drift, height), ms(ctx, duration), (raw) => {
    const t = easeInOut(raw);
    const live = size(ctx, el);
    frame.box = { left: drift * t, top: 0, width: live.width * t, height: live.height * t };
  });
  if (guide) ctx.overlay.flash(new Chip(agent.anchor, el, "snap", "blue"), 380);
  ctx.overlay.remove(guide);
  if (drift) {
    // A 1–2px arrow-key correction.
    agent.key("←", el, 320);
    ctx.overlay.flash(new Chip(agent.anchor, el, `← ${drift}px`, "dark"), 420);
    await ctx.clock.wait(ms(ctx, 110));
  }
  frame.box = { left: 0, top: 0, width, height };
  frame.setGrid(false);
  frame.setHandles(true);
  if (job.primary.kind === "image") frame.setPlaceholder(true);
  ctx.overlay.spark(agent.where());
}

async function fill(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const { width, height } = size(ctx, el);
  const style = job.primary.style;
  const isLine = job.primary.kind === "line";
  const solid = style.background.startsWith("rgb") && !/,\s*0\)$/.test(style.background);
  const swatch = style.background.includes("gradient") ? style.background : solid ? style.background : style.color;
  const hex = style.background.includes("gradient") ? "Gradient" : rgbToHex(solid ? style.background : style.color);
  agent.verb(isLine ? "stroking line" : "filling");
  await agent.travel(at(el, Math.min(width - 4, Math.max(4, width * 0.5)), Math.min(height - 4, Math.max(4, height * 0.5))));
  const popover = ctx.overlay.add(new ColorPopover(agent.anchor, el, swatch, hex));
  await agent.click();
  popover.pick();
  await ctx.clock.wait(ms(ctx, 120));
  const ghost = ghostOf(job, (created) => {
    if (job.actions.includes("ROUND_CORNERS")) created.node.style.borderRadius = "0px";
    if (job.primary.kind === "button") {
      state(job).typewriter = new Typewriter(created.node);
      if (job.actions.includes("ADD_SYMBOL")) {
        const symbols = Array.from(created.node.querySelectorAll<SVGElement>("svg"));
        symbols.forEach((svg) => { svg.style.visibility = "hidden"; });
        state(job).symbols = symbols;
      }
    }
  });
  const vertical = height > width * 2;
  await ctx.clock.tween(ms(ctx, D.fill * 0.7), (raw) => {
    const t = easeOut(raw);
    ghost.node.style.clipPath = vertical ? `inset(0 0 ${(1 - t) * 100}% 0)` : `inset(0 ${(1 - t) * 100}% 0 0)`;
  });
  ghost.node.style.clipPath = "";
  ctx.overlay.fadeOut(popover);
  state(job).frame?.setPlaceholder(false);
}

async function roundCorners(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const { width } = size(ctx, el);
  const radius = job.primary.style.radius;
  // After an early unlock the real frame is already showing; round its corners in place.
  const node = state(job).promoted ? el as HTMLElement : ghostOf(job).node;
  agent.verb(`radius ${Math.round(radius)}`);
  await agent.travel(at(el, width - 5, 5));
  const chip = ctx.overlay.add(new Chip(agent.anchor, el, "radius 0", "blue"));
  const inward = Math.min(radius * 0.7, 40);
  await agent.drag(at(el, width - 5 - inward, 5 + inward), ms(ctx, D.roundCorners), (raw) => {
    const r = radius * easeOut(raw);
    node.style.setProperty("border-radius", `${r}px`, "important");
    chip.text = `radius ${Math.round(r)}`;
  });
  node.style.removeProperty("border-radius");
  ctx.overlay.fadeOut(chip);
}

async function drawLine(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const { width, height } = size(ctx, el);
  const computed = getComputedStyle(el);
  const vertical = width <= 6 && height > width;
  // Thin elements are the line; containers draw the rule they show (top, bottom or left border).
  const y = height <= 6 ? height / 2 : parseFloat(computed.borderBottomWidth) > 0 && !(parseFloat(computed.borderTopWidth) > 0) ? height - 1 : 0;
  const start = vertical ? { x: width / 2, y: 0 } : { x: 0, y };
  const length = vertical ? height : width;
  agent.verb(`drawing line ${Math.round(length)}`);
  await agent.travel(at(el, start.x, start.y));
  const line = ctx.overlay.add(new LineDraw(el, start, vertical));
  keep(job, line);
  const duration = clamp(D.drawLineMin + length * 0.25, D.drawLineMin, D.drawLineMax);
  await agent.drag(vertical ? at(el, start.x, length) : at(el, length, start.y), ms(ctx, duration), (raw) => {
    line.length = length * easeInOut(raw);
  });
}

// ---------------------------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------------------------

function startScale(job: Job) {
  const from = job.rule.resizeFrom;
  return from ? clamp(from / Math.max(1, job.primary.style.fontSize), 0.1, 0.7) : 0.42;
}

async function drawTextbox(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const { width, height } = size(ctx, el);
  agent.verb("text box");
  await agent.travel(at(el, 0, 0));
  agent.key("T", el, 420);
  ctx.overlay.flash(new ToolRow(agent.anchor, el, "T"), 600);
  const frame = ctx.overlay.add(new SelectionFrame(el, { left: 0, top: 0, width: 0, height: 0 }, { dashed: true }));
  keep(job, frame);
  state(job).frame = frame;
  const lineHeight = Math.min(height, Math.max(14, job.primary.style.fontSize * 1.2));
  await agent.drag(at(el, width, lineHeight), ms(ctx, clamp(D.drawTextbox * 0.6 + width * 0.2, D.drawTextbox * 0.7, D.drawTextbox * 1.4)), (raw) => {
    frame.box = { left: 0, top: 0, width: width * easeOut(raw), height: lineHeight };
  });
  frame.box = { left: 0, top: 0, width, height };
  ghostOf(job, (created) => {
    if (job.actions.includes("RESIZE_TEXT")) {
      created.node.style.transformOrigin = "0 0";
      created.node.style.scale = String(startScale(job));
    }
    // Gradient text starts as plain ink; GRADIENT paints it.
    if (job.actions.includes("GRADIENT")) created.node.style.filter = "grayscale(1) brightness(1.9)";
    neutraliseColours(job, created);
    state(job).typewriter = new Typewriter(created.node);
  });
}

async function type(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const s = state(job);
  const typewriter = s.typewriter ?? (s.typewriter = new Typewriter(ghostOf(job).node));
  const { height } = size(ctx, el);
  agent.verb("typing…");
  const scale = job.actions.includes("RESIZE_TEXT") && job.step < job.actions.indexOf("RESIZE_TEXT") ? startScale(job) : 1;
  await agent.travel(at(el, 3, Math.min(height, job.primary.style.fontSize * 1.1) * scale * 0.7));
  if (job.primary.kind === "button") await agent.click();
  await typeInto(agent, ctx, typewriter, el, typewriter.total - trailingSymbolLength(job));
  if (job.primary.kind === "text" && typewriter.total > 8) await maybeReselect(agent, ctx, typewriter, el);
  if (!job.actions.includes("ADD_SYMBOL")) typewriter.finish();
}

async function resizeText(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const ghost = ghostOf(job);
  const { width, height } = size(ctx, el);
  const final = job.primary.style.fontSize;
  const from = startScale(job);
  agent.verb(`resizing ${Math.round(final * from)}→${Math.round(final)}`);
  await agent.travel(at(el, width * from * 0.5, height * from * 0.5));
  await agent.doubleClick();
  const highlight = ctx.overlay.add(new SelectionFrame(el, { left: 0, top: 0, width: width * from, height: height * from }, { handles: true }));
  highlight.node.classList.add("is-text-selection");
  keep(job, highlight);
  await agent.travel(at(el, width * from, height * from));
  const family = job.primary.style.family;
  const chip = ctx.overlay.add(new Chip(agent.anchor, el, `${family} ${Math.round(final * from)}`, "blue"));
  const mid = Math.round(lerp(final * from, final, 0.5));
  await agent.drag(at(el, width, height), ms(ctx, clamp(D.resizeText * 0.8 + final, D.resizeText * 0.8, D.resizeText * 1.3)), (raw) => {
    // Slight overshoot before settling.
    const scale = lerp(from, 1, easeOutBack(raw, 1.2));
    ghost.node.style.scale = scale.toFixed(4);
    highlight.box = { left: 0, top: 0, width: width * scale, height: height * scale };
    const value = Math.round(final * scale);
    chip.text = raw < 0.5 ? `${family} ${Math.round(final * from)} → ${value}` : `${family} ${Math.round(final * from)} → ${mid} → ${value}`;
  });
  ghost.node.style.scale = "";
  ghost.node.style.transformOrigin = "";
  ctx.overlay.fadeOut(chip);
  ctx.overlay.remove(highlight);
}

async function styleText(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const { width, height } = size(ctx, el);
  const { style } = job.primary;
  const colored = state(job).colored ?? [];
  agent.verb(colored.length ? "colouring words" : "styling");
  await agent.travel(at(el, Math.min(width - 6, width * 0.6), Math.min(height - 4, height * 0.5)));
  const weight = Number(style.weight) >= 600 ? "Bold" : Number(style.weight) >= 500 ? "Medium" : "Regular";
  const tracking = style.fontSize ? `${Math.round((parseFloat(style.tracking) || 0) / style.fontSize * 100)}%` : "0%";
  ctx.overlay.flash(new Chip(agent.anchor, el, `${weight} · ${tracking}`, "dark"), 600);
  await agent.click();
  for (const item of colored) {
    const rect = item.el.getBoundingClientRect(), origin = ctx.overlay.rect(el);
    await agent.glide(at(el, rect.left - origin.left + rect.width / 2, rect.top - origin.top + rect.height / 2), ms(ctx, 170));
    const popover = ctx.overlay.add(new ColorPopover(agent.anchor, el, item.color, rgbToHex(item.color)));
    await agent.click();
    popover.pick();
    item.el.style.color = "";
    item.el.style.webkitTextFillColor = "";
    await ctx.clock.wait(ms(ctx, 110));
    ctx.overlay.fadeOut(popover);
  }
  if (!colored.length) {
    ctx.overlay.flash(new ColorPopover(agent.anchor, el, style.color, rgbToHex(style.color)), 520);
    await ctx.clock.wait(ms(ctx, D.style * 0.5));
  }
}

/** Gradient handle: drag from the first stop to the last while the gradient paints in. */
async function gradient(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const { width, height } = size(ctx, el);
  agent.verb("painting gradient");
  const isText = job.primary.kind === "text";
  const ghost = ghostOf(job, (created) => {
    if (job.actions.includes("ROUND_CORNERS")) created.node.style.borderRadius = "0px";
    created.node.style.clipPath = "inset(0 0 100% 0)";
  });
  await agent.travel(at(el, width * 0.5, 4));
  const handle = ctx.overlay.add(new LineDraw(el, { x: width * 0.5, y: 4 }, true));
  handle.node.classList.add("is-gradient");
  const label = isText ? "#FF8A5C → #E5322D → 0%" : rgbToHex(job.primary.style.background.match(/rgba?\([^)]*\)/)?.[0] ?? "#2A0A12");
  const popover = ctx.overlay.add(new ColorPopover(agent.anchor, el, isText ? getComputedStyle(el).backgroundImage : job.primary.style.background, `Gradient · ${label}`));
  await agent.drag(at(el, width * 0.5, height - 4), ms(ctx, D.gradient), (raw) => {
    const t = easeInOut(raw);
    handle.length = (height - 8) * t;
    if (isText) ghost.node.style.filter = `grayscale(${1 - t}) brightness(${1 + 0.9 * (1 - t)})`;
    else ghost.node.style.clipPath = `inset(0 0 ${(1 - t) * 100}% 0)`;
  });
  ghost.node.style.filter = "";
  ghost.node.style.clipPath = "";
  popover.pick();
  ctx.overlay.remove(handle);
  ctx.overlay.fadeOut(popover);
  state(job).frame?.setPlaceholder(false);
}

/** Pen stroke reveal: the text (or path) is drawn left to right. */
async function stroke(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const { width, height } = size(ctx, el);
  const rotation = rotationOf(el);
  agent.verb("drawing stroke");
  const ghost = ghostOf(job, (created) => {
    created.node.style.clipPath = "inset(-20% 100% -20% 0)";
    // Drawn level first; ROTATE turns it to its final angle.
    if (job.actions.includes("ROTATE") && rotation) created.node.style.rotate = `${-rotation}deg`;
    state(job).rotation = rotation;
  });
  const strokes = Array.from(ghost.node.querySelectorAll<SVGGeometryElement>("path, line, polyline"));
  const lengths = strokes.map((shape) => { try { return shape.getTotalLength(); } catch { return 0; } });
  await agent.travel(at(el, 0, height * 0.6));
  ctx.overlay.flash(new ToolRow(agent.anchor, el, "/"), 500);
  const chip = ctx.overlay.add(new Chip(agent.anchor, el, "pen · 1.5", "dark"));
  agent.pressed = true;
  await ctx.clock.tween(ms(ctx, D.stroke), (raw) => {
    const t = easeInOut(raw);
    ghost.node.style.clipPath = `inset(-20% ${(1 - t) * 100}% -20% 0)`;
    agent.anchor = at(el, width * t, height * (0.55 + 0.18 * Math.sin(t * Math.PI * 5)));
    strokes.forEach((shape, index) => {
      if (!lengths[index]) return;
      shape.style.strokeDasharray = String(lengths[index]);
      shape.style.strokeDashoffset = String(lengths[index] * (1 - t));
    });
  });
  agent.pressed = false;
  ghost.node.style.clipPath = "";
  strokes.forEach((shape) => { shape.style.strokeDasharray = ""; shape.style.strokeDashoffset = ""; });
  ctx.overlay.fadeOut(chip);
}

/** Rotation handle: turn the element from level to its final angle. */
async function rotate(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const ghost = ghostOf(job);
  const { width, height } = size(ctx, el);
  const rotation = state(job).rotation ?? rotationOf(el);
  agent.verb(`rotating ${rotation}°`);
  await agent.travel(at(el, width * 0.85, -14));
  const handle = ctx.overlay.add(new Floater(at(el, width * 0.85, -14), "ab-rotate-handle"));
  const chip = ctx.overlay.add(new Chip(agent.anchor, el, "rotate 0°", "blue"));
  await agent.drag(at(el, width * 0.85, -14 + rotation * 2.4), ms(ctx, D.rotate), (raw) => {
    const angle = rotation * easeOutBack(raw, 1.1);
    ghost.node.style.rotate = `${-rotation + angle}deg`;
    handle.anchor = agent.anchor;
    chip.text = `rotate 0° → ${angle.toFixed(1)}°`;
  });
  ghost.node.style.rotate = "";
  ctx.overlay.remove(handle);
  ctx.overlay.fadeOut(chip);
  void height;
}

/** The award lands with a 2px shake. */
async function slam(agent: Agent, job: Job, ctx: ActionContext) {
  const node = ghostOf(job).node;
  agent.verb("slamming award");
  const rect = node.getBoundingClientRect();
  await agent.travel({ el: null, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  await agent.click(50, true);
  // The award line nearly fills the page, so it only grows as wide as the screen allows (past that the page would scroll sideways). The height carries the rest of the slam.
  const center = rect.left + rect.width / 2;
  const text = document.createRange();
  text.selectNodeContents(node);
  const reach = Math.max(rect.right, text.getBoundingClientRect().right) - center;
  const wide = clamp((document.documentElement.clientWidth - center - 2) / reach, 1, 1.4);
  await ctx.clock.tween(ms(ctx, D.slam * 2), (raw) => {
    const eased = easeOut(raw);
    node.style.scale = `${lerp(wide, 1, eased).toFixed(4)} ${lerp(1.4, 1, eased).toFixed(4)}`;
    node.style.translate = raw < 1 ? `${(raw * 7) % 2 < 1 ? 2 : -2}px 0` : "";
  });
  node.style.scale = "";
  node.style.translate = "";
  ctx.overlay.spark({ x: rect.left + rect.width / 2, y: rect.top });
}

// ---------------------------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------------------------

async function dragFromTray(agent: Agent, ctx: ActionContext, el: Element, source: string, index: number) {
  const tray = ctx.tray();
  tray.acquire(ctx.overlay);
  const thumb = tray.thumbCenter(index);
  await agent.travel({ el: null, x: thumb.x, y: thumb.y });
  await agent.click(60);
  const ghostThumb = h("span", "ab-drag-thumb");
  if (source) ghostThumb.style.backgroundImage = `url("${source}")`;
  const floater = ctx.overlay.add(new Floater(() => agent.anchor, "ab-drag", ghostThumb));
  const { width, height } = size(ctx, el);
  agent.pressed = true;
  await agent.travel(at(el, width / 2, height / 2));
  agent.pressed = false;
  ctx.overlay.remove(floater);
  tray.release(ctx.overlay);
}

async function develop(ctx: ActionContext, node: HTMLElement, el: Element) {
  const sweep = ctx.overlay.lowQuality ? null : ctx.overlay.add(new SelectionFrame(el, { left: 0, top: 0, ...size(ctx, el) }));
  if (sweep) sweep.node.className = "ab-sweep";
  await ctx.clock.tween(ms(ctx, D.dropImage * 0.5), (raw) => {
    const t = easeOut(raw);
    node.style.filter = `blur(${(1 - t) * 10}px) brightness(${1 + (1 - t) * 0.5})`;
    node.style.opacity = String(0.3 + 0.7 * t);
    sweep?.node.style.setProperty("--sweep", `${raw * 140 - 20}%`);
  });
  node.style.filter = "";
  node.style.opacity = "1";
  ctx.overlay.remove(sweep);
}

async function dropImage(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  agent.verb(job.primary.layerKind === "logo-plate" ? "placing logo" : "placing image");
  const source = imageSourceOf(el);
  await dragFromTray(agent, ctx, el, source, job.seed);
  const ghost = ghostOf(job, (created) => { created.node.style.opacity = "0"; });
  state(job).frame?.setPlaceholder(false);
  ctx.overlay.spark(agent.where());
  await develop(ctx, ghost.node, el);
}

async function crop(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const ghost = ghostOf(job);
  const { width, height } = size(ctx, el);
  agent.verb("cropping image");
  await agent.travel(at(el, width, height));
  const image = ghost.node instanceof HTMLImageElement ? ghost.node : ghost.node.querySelector("img");
  const finalPosition = image ? getComputedStyle(image).objectPosition : "";
  const chip = ctx.overlay.add(new Chip(agent.anchor, el, "crop", "blue"));
  await agent.drag(at(el, width - 16, height - 12), ms(ctx, D.crop * 0.35));
  await agent.drag(at(el, width, height), ms(ctx, D.crop * 0.3));
  await agent.travel(at(el, width / 2, height / 2));
  chip.text = "pan";
  await agent.drag(at(el, width / 2 + 10, height / 2 + 4), ms(ctx, D.crop * 0.4), (raw) => {
    const t = easeInOut(raw);
    if (image) image.style.objectPosition = `calc(50% + ${(1 - t) * 14}px) calc(50% + ${(1 - t) * 8}px)`;
    else ghost.node.style.translate = `${(1 - t) * -6}px ${(1 - t) * -3}px`;
  });
  if (image) image.style.objectPosition = finalPosition;
  ghost.node.style.translate = "";
  ctx.overlay.fadeOut(chip);
}

/** Mask with a bright scanline running down the image. */
async function mask(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const ghost = ghostOf(job);
  const { width, height } = size(ctx, el);
  agent.verb("masking image");
  await agent.travel(at(el, width * 0.92, 4));
  const line = ctx.overlay.add(new SelectionFrame(el, { left: 0, top: 0, width, height: 2 }));
  line.node.className = "ab-scanline";
  await agent.drag(at(el, width * 0.92, height - 4), ms(ctx, D.crop), (raw) => {
    line.box = { left: 0, top: (height - 2) * raw, width, height: 2 };
    ghost.node.style.filter = `brightness(${1 + 0.35 * Math.sin(raw * Math.PI)})`;
  });
  ghost.node.style.filter = "";
  ctx.overlay.remove(line);
}

async function swapImage(agent: Agent, job: Job, ctx: ActionContext) {
  const copies = state(job).copies;
  if (!job.copy || !copies) return;
  agent.verb("swapping image");
  for (const targetNode of job.copy.targets) {
    const ghost = copies.get(targetNode);
    if (!ghost) continue;
    const sourceLayers = Array.from(job.copy.source.el.querySelectorAll("[data-layer]"));
    const targetLayers = Array.from(targetNode.el.querySelectorAll("[data-layer]"));
    for (let index = 0; index < targetLayers.length; index += 1) {
      const layer = targetLayers[index];
      if (layer.getAttribute("data-layer") !== "image") continue;
      const slot = ghostChild(ghost, index);
      if (!slot || sourceLayers[index]?.getAttribute("data-layer") !== "image") continue;
      await dragFromTray(agent, ctx, layer, imageSourceOf(layer), job.seed + index);
      const replacement = layer.cloneNode(true) as HTMLElement;
      replacement.classList.remove("bm-hidden");
      replacement.querySelectorAll(".bm-hidden").forEach((child) => child.classList.remove("bm-hidden"));
      replacement.removeAttribute("data-layer");
      replacement.querySelectorAll("[data-layer]").forEach((child) => child.removeAttribute("data-layer"));
      replacement.style.width = `${slot.offsetWidth}px`;
      replacement.style.height = `${slot.offsetHeight}px`;
      replacement.style.opacity = "0";
      slot.replaceWith(replacement);
      ctx.overlay.spark(agent.where());
      await develop(ctx, replacement, layer);
      break;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Symbols
// ---------------------------------------------------------------------------------------------

function symbolPreview(el: Element) {
  const preview = el.cloneNode(true) as HTMLElement;
  preview.removeAttribute("id");
  preview.classList.remove("bm-hidden");
  preview.removeAttribute("data-layer");
  preview.querySelectorAll("[data-layer]").forEach((child) => child.removeAttribute("data-layer"));
  preview.setAttribute("aria-hidden", "true");
  const wrap = h("span", "ab-symbol");
  wrap.style.color = getComputedStyle(el).color;
  wrap.appendChild(preview);
  return wrap;
}

async function openPicker(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const { width, height } = size(ctx, el);
  agent.verb("placing icon");
  await agent.travel(at(el, width / 2, height / 2));
  if (agent.rng.chance(0.5)) agent.key("/", el, 420);
  else ctx.overlay.flash(new Chip(agent.anchor, el, "+", "blue"), 420);
  await agent.click();
  const picker = ctx.overlay.add(new SymbolPicker(agent.anchor, el, symbolPreview(el), job.seed));
  keep(job, picker);
  state(job).picker = picker;
  await ctx.clock.wait(ms(ctx, 120));
}

async function pickSymbol(agent: Agent, job: Job, ctx: ActionContext) {
  const picker = state(job).picker;
  if (!picker) return;
  agent.verb("picking symbol");
  const cellAnchor = (index: number): Anchor => {
    const center = picker.cellCenter(index);
    return { el: null, x: picker.position.x + center.x, y: picker.position.y + center.y };
  };
  const wrong = agent.style === "precise" ? 1 : agent.rng.int(2, 3);
  for (let index = 0; index < wrong; index += 1) {
    let cell = agent.rng.int(0, 11);
    if (cell === picker.targetIndex) cell = (cell + 1) % 12;
    await agent.travel(cellAnchor(cell));
    picker.hover(cell);
    await ctx.clock.wait(ms(ctx, D.pickerHover));
  }
  await agent.travel(cellAnchor(picker.targetIndex));
  picker.hover(picker.targetIndex);
  await agent.click();
  picker.choose(picker.targetIndex);
}

async function dropSymbol(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const picker = state(job).picker;
  const { width, height } = size(ctx, el);
  agent.verb("dropping icon");
  const carried = ctx.overlay.add(new Floater(() => agent.anchor, "ab-drag", symbolPreview(el)));
  agent.pressed = true;
  if (picker) ctx.overlay.remove(picker);
  await agent.travel(at(el, width / 2, height / 2));
  agent.pressed = false;
  ctx.overlay.remove(carried);
  const ghost = ghostOf(job, (created) => {
    created.node.style.transformOrigin = "50% 50%";
    created.node.style.scale = "0.3";
    created.node.style.filter = "grayscale(1) brightness(1.7)";
  });
  ctx.overlay.spark(agent.where());
  // SVG strokes draw themselves in.
  const strokes = Array.from(ghost.node.querySelectorAll<SVGGeometryElement>("path, circle, rect, line, polyline"));
  const lengths = strokes.map((shape) => { try { return shape.getTotalLength(); } catch { return 0; } });
  await ctx.clock.tween(ms(ctx, 240), (raw) => {
    ghost.node.style.scale = String(lerp(0.3, 0.55, easeOutBack(raw, 2)));
    strokes.forEach((shape, index) => {
      if (!lengths[index]) return;
      shape.style.strokeDasharray = String(lengths[index]);
      shape.style.strokeDashoffset = String(lengths[index] * (1 - raw));
    });
  });
  strokes.forEach((shape) => { shape.style.strokeDasharray = ""; shape.style.strokeDashoffset = ""; });
}

async function scaleSymbol(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const ghost = ghostOf(job);
  const { width, height } = size(ctx, el);
  agent.verb("scaling icon");
  await agent.travel(at(el, width / 2 + width * 0.28, height / 2 + height * 0.28));
  const chip = ctx.overlay.add(new Chip(agent.anchor, el, "", "blue"));
  await agent.drag(at(el, width, height), ms(ctx, D.scale), (raw) => {
    const scale = lerp(0.55, 1, easeOutBack(raw, 1.4));
    ghost.node.style.scale = scale.toFixed(3);
    chip.text = `${Math.round(width * scale)} × ${Math.round(height * scale)}`;
  });
  ghost.node.style.scale = "";
  ghost.node.style.transformOrigin = "";
  ctx.overlay.fadeOut(chip);
}

async function recolor(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const ghost = ghostOf(job);
  const { width, height } = size(ctx, el);
  const color = getComputedStyle(el).color;
  agent.verb("recolouring");
  await agent.travel(at(el, width * 0.7, height * 0.3));
  const popover = ctx.overlay.add(new ColorPopover(agent.anchor, el, color, rgbToHex(color)));
  await agent.click();
  popover.pick();
  await ctx.clock.tween(ms(ctx, D.recolor), (raw) => {
    ghost.node.style.filter = `grayscale(${1 - raw}) brightness(${1 + 0.7 * (1 - raw)})`;
  });
  ghost.node.style.filter = "";
  ctx.overlay.fadeOut(popover);
}

async function addSymbol(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const s = state(job);
  const { width, height } = size(ctx, el);
  const glyph = /([↗↑→▶↓✓+↔])\s*$/.exec(job.primary.text)?.[1] ?? "↓";
  agent.verb(`adding ${glyph}`);
  await agent.travel(at(el, width - Math.min(18, width * 0.2), height / 2));
  ctx.overlay.flash(new Chip(agent.anchor, el, `+ ${glyph}`, "blue"), 460);
  await agent.click();
  s.typewriter?.finish();
  for (const svg of s.symbols ?? []) {
    svg.style.visibility = "";
    svg.style.scale = "0.4";
  }
  ctx.overlay.spark(agent.where());
  await ctx.clock.tween(ms(ctx, 160), (raw) => {
    for (const svg of s.symbols ?? []) svg.style.scale = String(lerp(0.4, 1, easeOutBack(raw, 2)));
  });
  for (const svg of s.symbols ?? []) svg.style.scale = "";
}

// ---------------------------------------------------------------------------------------------
// Copy / paste
// ---------------------------------------------------------------------------------------------

/** Is most of this element on screen? */
function onScreen(ctx: ActionContext, el: Element) {
  const rect = ctx.overlay.rect(el);
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
}

async function copy(agent: Agent, job: Job, ctx: ActionContext) {
  if (!job.copy) return;
  const source = job.copy.source.el;
  const { width, height } = size(ctx, source);
  const batch = job.copy.targets.length > 1;
  agent.verb(batch ? `copying ×${job.copy.targets.length}` : "copying");
  if (!onScreen(ctx, source)) {
    // The original is off screen: it was copied earlier; paste from the clipboard at the target.
    const targetEl = job.copy.targets[0].el, t = size(ctx, targetEl);
    await agent.travel(at(targetEl, t.width / 2, t.height / 2));
    ctx.overlay.flash(new Chip(agent.anchor, targetEl, `clipboard · ${job.copy.source.layerKind.replace(/-/g, " ")}`, "dark"), 600);
    await ctx.clock.wait(ms(ctx, 160));
    return;
  }
  if (batch) {
    // Rubber-band select before moving the group.
    await agent.travel(at(source, -10, -10));
    const band = ctx.overlay.add(new SelectionFrame(source, { left: -10, top: -10, width: 0, height: 0 }, { dashed: true }));
    await agent.drag(at(source, width + 10, height + 10), ms(ctx, 300), (raw) => {
      band.box = { left: -10, top: -10, width: (width + 20) * raw, height: (height + 20) * raw };
    });
    ctx.overlay.fadeOut(band);
  } else {
    await agent.travel(at(source, width / 2, height / 2));
    await agent.click();
  }
  const selection = ctx.overlay.add(new SelectionFrame(source, { left: 0, top: 0, width, height }, { handles: true }));
  agent.key("⌘C", source);
  await ctx.clock.wait(ms(ctx, 180));
  ctx.overlay.fadeOut(selection);
}

async function paste(agent: Agent, job: Job, ctx: ActionContext) {
  if (!job.copy) return;
  const { source, targets } = job.copy;
  const s = state(job);
  const copies = s.copies ?? (s.copies = new Map());
  const simple = targets.length > 1;
  agent.verb(simple ? `pasting ×${targets.length}` : `pasting ${source.layerKind.replace(/-/g, " ")}`);
  for (const node of targets) {
    const el = node.el;
    const sourceRect = ctx.overlay.rect(source.el), targetRect = ctx.overlay.rect(el);
    const { width, height } = size(ctx, el);
    if (!simple) await agent.travel(at(el, width / 2, height / 2));
    agent.key(agent.style === "showy" && !simple ? "⌥ drag" : "⌘V", el, simple ? 300 : 520);
    const ghost = createGhost(el, { source: source.el, hideChildLayers: false });
    copies.set(node, ghost);
    // Longer text pasted into a short slot at the screen's edge would make the page scroll sideways until it's retyped.
    if (ghost.node.getBoundingClientRect().left + ghost.node.scrollWidth > document.documentElement.clientWidth) ghost.node.style.overflow = "clip";
    // Pasted next to where it was copied from — or, when that is far away, just beside the slot.
    const far = Math.hypot(sourceRect.left - targetRect.left, sourceRect.top - targetRect.top) > window.innerHeight * 0.8;
    const offset = far ? { x: 18, y: 18 } : { x: sourceRect.left - targetRect.left + 14, y: sourceRect.top - targetRect.top + 14 };
    const dashed = ctx.overlay.add(new SelectionFrame(el, { left: offset.x, top: offset.y, width, height }, { dashed: true }));
    if (simple) {
      dashed.box = { left: 0, top: 0, width, height };
      await agent.travel(at(el, width / 2, height / 2));
      await ctx.clock.wait(ms(ctx, 50));
    } else {
      ghost.node.style.translate = `${offset.x}px ${offset.y}px`;
      await agent.travel(at(el, offset.x + width / 2, offset.y + height / 2));
      await agent.drag(at(el, width / 2, height / 2), ms(ctx, clamp(D.pasteDrag * 0.7 + Math.hypot(offset.x, offset.y) * 0.2, D.pasteDrag * 0.7, D.pasteDrag * 1.4)), (raw) => {
        const t = easeInOut(raw);
        ghost.node.style.translate = `${offset.x * (1 - t)}px ${offset.y * (1 - t)}px`;
        dashed.box = { left: offset.x * (1 - t), top: offset.y * (1 - t), width, height };
      });
      ghost.node.style.translate = "";
    }
    const horizontalGap = targetRect.left - (sourceRect.left + sourceRect.width);
    const verticalGap = targetRect.top - (sourceRect.top + sourceRect.height);
    const gap = Math.round(horizontalGap >= 0 ? horizontalGap : verticalGap >= 0 ? verticalGap : Math.abs(targetRect.left - sourceRect.left));
    if (!far && (!simple || node === targets[targets.length - 1])) ctx.overlay.flash(new Chip(agent.anchor, el, `gap ${Math.max(0, gap)}`, "blue"), 520);
    else if (far) ctx.overlay.flash(new Chip(agent.anchor, el, "snap ✓", "blue"), 420);
    ctx.overlay.fadeOut(dashed, 120);
  }
}

async function retype(agent: Agent, job: Job, ctx: ActionContext) {
  if (!job.copy) return;
  const copies = state(job).copies;
  if (!copies) return;
  agent.verb("retyping");
  for (const node of job.copy.targets) {
    const ghost = copies.get(node);
    if (!ghost) continue;
    const pairs: { slot: HTMLElement; real: Element }[] = [];
    const targetLayers = Array.from(node.el.querySelectorAll("[data-layer]"));
    if (node.text) pairs.push({ slot: ghost.node, real: node.el });
    targetLayers.forEach((layer, index) => {
      const kind = layer.getAttribute("data-layer");
      if (kind === "image" || kind === "icon" || kind === "card") return;
      const slot = ghostChild(ghost, index);
      if (slot && (layer.textContent ?? "").trim()) pairs.push({ slot, real: layer });
    });
    let typedOne = false;
    for (const { slot, real } of pairs) {
      if (slot.textContent === real.textContent) continue;
      // Lock the slot's box: new text never moves the siblings inside the ghost.
      if (slot !== ghost.node) {
        slot.style.width = `${slot.offsetWidth}px`;
        slot.style.height = `${slot.offsetHeight}px`;
      }
      const fresh = real.cloneNode(true) as HTMLElement;
      fresh.querySelectorAll("[data-layer]").forEach((child) => child.removeAttribute("data-layer"));
      fresh.querySelectorAll(".bm-hidden").forEach((child) => child.classList.remove("bm-hidden"));
      if (typedOne) {
        // The headline slot is retyped by hand; the rest are pasted in one go.
        agent.key("⌘V", node.el, 300);
        slot.innerHTML = fresh.innerHTML;
        await ctx.clock.wait(ms(ctx, 80));
        continue;
      }
      typedOne = true;
      const rect = real.getBoundingClientRect(), origin = ctx.overlay.rect(node.el);
      await agent.travel(at(node.el, rect.left - origin.left + Math.min(rect.width / 2, 40), rect.top - origin.top + rect.height / 2));
      await agent.doubleClick();
      const highlight = ctx.overlay.add(new SelectionFrame(real, { left: 0, top: 0, width: rect.width, height: rect.height }));
      highlight.node.classList.add("is-text-selection");
      agent.key("⌘A", node.el, 380);
      await ctx.clock.wait(ms(ctx, 110));
      // Select-all, then type the new text over the old.
      slot.innerHTML = fresh.innerHTML;
      if (slot === ghost.node) {
        // The copy can come from a differently styled sibling (a nowrap date pasted over a
        // paragraph); the new text takes the real element's styles, so it wraps as it will end up.
        fresh.classList.remove("bm-hidden");
        slot.className = fresh.className;
        slot.style.animation = "none";
        alignGhost(slot, real);
        if (node.el instanceof HTMLInputElement) slot.setAttribute("placeholder", node.el.placeholder);
      }
      const typewriter = new Typewriter(slot);
      ctx.overlay.remove(highlight);
      await typeInto(agent, ctx, typewriter, node.el, typewriter.total, true);
      typewriter.finish();
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Motion beats
// ---------------------------------------------------------------------------------------------

/** A real demonstration of the raw → real slider: drag the divider across and drop it back. */
async function sliderDemo(agent: Agent, job: Job, ctx: ActionContext) {
  const handle = target(job);
  const comparison = handle.closest(".comparison");
  const final = comparison?.querySelector<HTMLElement>(".comparison-final");
  if (!comparison || !final) return;
  agent.verb("dragging divider");
  const divider = ghostOf(job);
  // Play the demo on a copy of the final panel so the real component state never changes.
  const finalGhost = createGhost(final, { hideChildLayers: false });
  const restoreFinal = keepStyle(final);
  final.style.visibility = "hidden";
  const box = ctx.overlay.rect(comparison);
  const start = ctx.overlay.rect(handle).left + ctx.overlay.rect(handle).width / 2 - box.left;
  const split = (start / box.width) * 100;
  await agent.travel(at(comparison, start, box.height / 2));
  const chip = ctx.overlay.add(new Chip(agent.anchor, comparison, `${Math.round(split)}%`, "blue"));
  const run = async (from: number, to: number, duration: number) => {
    await agent.drag(at(comparison, (to / 100) * box.width, box.height / 2), ms(ctx, duration), (raw) => {
      const value = lerp(from, to, easeInOut(raw));
      finalGhost.node.style.clipPath = `inset(0 0 0 ${value}%)`;
      divider.node.style.translate = `${((value - split) / 100) * box.width}px 0`;
      chip.anchor = agent.anchor;
      chip.text = `${Math.round(value)}% final`;
    });
  };
  await run(split, 4, D.sliderDemo * 0.45);
  await ctx.clock.wait(ms(ctx, 160));
  await run(4, split, D.sliderDemo * 0.4);
  divider.node.style.translate = "";
  finalGhost.remove();
  restoreFinal();
  ctx.overlay.fadeOut(chip);
}

/** Drag a speed handle: the collab marquee starts moving. */
async function marquee(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const { width, height } = size(ctx, el);
  agent.verb("starting marquee");
  await agent.travel(at(el, width * 0.35, height + 18));
  const track = ctx.overlay.add(new LineDraw(el, { x: width * 0.35, y: height + 18 }, false));
  track.length = 0;
  const chip = ctx.overlay.add(new Chip(agent.anchor, el, "speed 0s", "blue"));
  await agent.drag(at(el, width * 0.65, height + 18), ms(ctx, D.marquee), (raw) => {
    track.length = width * 0.3 * raw;
    chip.anchor = agent.anchor;
    chip.text = `speed ${Math.round(34 * raw)}s loop`;
  });
  (window as Window & { __abResumeMarquee?: () => void }).__abResumeMarquee?.();
  ctx.overlay.remove(track);
  ctx.overlay.fadeOut(chip);
}

/** The halftone wordmark is stamped in, its print head sweeping across. */
async function stamp(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const footer = el.closest(".hwf");
  agent.verb("stamping wordmark");
  const { width, height } = size(ctx, el);
  await agent.travel(at(el, width * 0.03, height * 0.42));
  await agent.click(80, true);
  const chip = ctx.overlay.add(new Chip(agent.anchor, el, "stamp 0%", "blue"));
  await ctx.clock.tween(ms(ctx, D.stamp), (raw) => {
    footer?.dispatchEvent(new CustomEvent("hwf:reveal", { detail: raw }));
    const frontier = clamp(raw * (1 + ctx.printSoft) - ctx.printSoft / 2);
    const live = size(ctx, el);
    agent.anchor = at(el, live.width * (0.03 + 0.94 * frontier), live.height * (0.42 + 0.12 * Math.sin(raw * Math.PI * 6)));
    chip.anchor = agent.anchor;
    chip.text = `stamp ${Math.round(raw * 100)}%`;
  });
  footer?.dispatchEvent(new CustomEvent("hwf:reveal", { detail: 1 }));
  ctx.overlay.fadeOut(chip);
}

// ---------------------------------------------------------------------------------------------
// Finale
// ---------------------------------------------------------------------------------------------

function luminance(color: string) {
  const match = /rgba?\(([^)]+)\)/.exec(color);
  if (!match) return 0;
  const [r, g, b] = match[1].split(",").slice(0, 3).map((part) => {
    const channel = parseFloat(part) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast of an element's text against the nearest solid background behind it. */
export function contrastOf(el: Element) {
  const color = getComputedStyle(el).color;
  let node: Element | null = el, background = "rgb(5, 5, 10)";
  while (node) {
    const value = getComputedStyle(node).backgroundColor;
    if (value && !/rgba\([^)]*,\s*0\)$/.test(value) && value !== "transparent") { background = value; break; }
    node = node.parentElement;
  }
  const a = luminance(color), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** QA: check a finished element; a green tick and its real contrast ratio. */
async function qaCheck(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const { width, height } = size(ctx, el);
  agent.verb("QA check");
  await agent.travel(at(el, Math.min(width - 4, width * 0.8), height * 0.5));
  await agent.click();
  const ratio = contrastOf(el);
  ctx.overlay.flash(new Floater(at(el, Math.min(width - 4, width * 0.8), height * 0.5), "ab-tick", "✓"), 700);
  ctx.overlay.flash(new Chip(agent.anchor, el, `contrast ${ratio.toFixed(1)}:1 ${ratio >= 4.5 ? "✓" : "AA large ✓"}`, "green"), 900);
  await ctx.clock.wait(ms(ctx, D.qaCheck * 0.6));
}

/** Play the footer's hover state once: the dots part around the cursor as it sweeps. */
async function hoverPlay(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const { width, height } = size(ctx, el);
  agent.verb("playing hover");
  await agent.travel(at(el, width * 0.12, height * 0.45));
  const send = (type: string) => {
    const point = agent.where();
    el.dispatchEvent(new PointerEvent(type, { clientX: point.x, clientY: point.y, bubbles: false, pointerType: "mouse" }));
  };
  await ctx.clock.tween(ms(ctx, 1100), (raw) => {
    agent.anchor = at(el, width * lerp(0.12, 0.88, easeInOut(raw)), height * (0.45 + 0.12 * Math.sin(raw * Math.PI * 2)));
    send("pointermove");
  });
  send("pointerleave");
}

/** The lead agent clicks Go live on the control bar. */
async function goLive(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const { width, height } = size(ctx, el);
  agent.verb("going live");
  await agent.travel(at(el, width / 2, height / 2));
  await agent.click(90, true);
  (el as HTMLElement).click();
}

export const ACTIONS: Record<ActionName, (agent: Agent, job: Job, ctx: ActionContext) => Promise<void>> = {
  DRAW_BOX: drawBox,
  FILL: fill,
  ROUND_CORNERS: roundCorners,
  DRAW_TEXTBOX: drawTextbox,
  TYPE: type,
  RESIZE_TEXT: resizeText,
  STYLE: styleText,
  DROP_IMAGE: dropImage,
  CROP: crop,
  OPEN_PICKER: openPicker,
  PICK_SYMBOL: pickSymbol,
  DROP: dropSymbol,
  SCALE: scaleSymbol,
  RECOLOR: recolor,
  ADD_SYMBOL: addSymbol,
  DRAW_LINE: drawLine,
  COPY: copy,
  PASTE: paste,
  RETYPE: retype,
  SWAP_IMAGE: swapImage,
  GRADIENT: gradient,
  STROKE: stroke,
  ROTATE: rotate,
  SLAM: slam,
  MASK: mask,
  SLIDER_DEMO: sliderDemo,
  MARQUEE: marquee,
  STAMP: stamp,
  QA_CHECK: qaCheck,
  HOVER_PLAY: hoverPlay,
  GO_LIVE: goLive
};

/** Remove every ghost and decoration a job left behind (completion or skip). */
export function disposeJob(job: Job, overlay: Overlay) {
  const s = state(job);
  s.typewriter?.finish();
  s.ghost?.remove();
  s.copies?.forEach((ghost) => ghost.remove());
  s.decor?.forEach((decoration) => overlay.remove(decoration));
  job.state = {};
}
