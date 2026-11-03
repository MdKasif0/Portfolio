/**
 * The action library. Each action moves the agent's cursor, plays its visuals on the
 * ghost and the tool chrome, then resolves. Actions read live rects so they stay on
 * target while the tour scrolls. Durations are multiplied by `ctx.tempo`.
 */

import { clamp, easeInOut, easeOut, easeOutBack, lerp, type Clock } from "@/components/agent-build/engine/clock";
import type { ActionName, BuildNode, Job } from "@/components/agent-build/engine/compiler";
import type { Agent } from "@/components/agent-build/engine/agent";
import { createGhost, ghostChild, imageSourceOf, Typewriter, type Ghost } from "@/components/agent-build/engine/ghost";
import { Caret, Chip, ColorPopover, Floater, h, LineDraw, SelectionFrame, SymbolPicker, ToolRow, type Anchor, type AssetTray, type Decoration, type Overlay } from "@/components/agent-build/engine/overlay";

export interface ActionContext {
  clock: Clock;
  overlay: Overlay;
  /** Duration multiplier (mobile runs faster). */
  tempo: number;
  tray: () => AssetTray;
  /** Halftone print edge softness, mirrored from the footer component. */
  printSoft: number;
}

type JobState = {
  frame?: SelectionFrame;
  ghost?: Ghost;
  typewriter?: Typewriter;
  colored?: { el: HTMLElement; color: string }[];
  copies?: Map<BuildNode, Ghost>;
  decor?: Decoration[];
  symbolText?: string;
};

const state = (job: Job) => job.state as JobState;
const target = (job: Job) => job.primary.el;

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
  try {
    await typeChars(agent, ctx, typewriter, avoid, limit, fast);
  } finally {
    ctx.overlay.remove(caret);
  }
}

async function typeChars(agent: Agent, ctx: ActionContext, typewriter: Typewriter, avoid: Element, limit: number, fast: boolean) {
  const { clock, tempo } = ctx;
  const full = typewriter.text;
  const typed = Math.min(limit, fast ? 20 : 36);
  let burst = agent.rng.int(5, 12);
  for (let count = typewriter.shown + 1; count <= typed; count += 1) {
    // About 1 in 40 characters is a typo, caught and backspaced at once.
    if (!fast && agent.rng.chance(1 / 40) && /\w/.test(full[count - 1] ?? "")) {
      typewriter.set(count - 1, agent.rng.pick(["e", "r", "a", "s", "n", "t"]));
      await clock.wait(agent.rng.range(40, 70) * tempo);
      agent.key("⌫", avoid, 380);
      typewriter.set(count - 1);
      await clock.wait(agent.rng.range(70, 110) * tempo);
    }
    typewriter.set(count);
    await clock.wait(agent.rng.range(fast ? 14 : 22, fast ? 26 : 45) * tempo);
    if (--burst <= 0) {
      burst = agent.rng.int(5, 12);
      await clock.wait(agent.rng.range(80, 200) * tempo);
    }
  }
  // Long copy: the first line is typed, the rest flows in by lines.
  let shown = typewriter.shown;
  while (shown < limit) {
    shown = Math.min(limit, shown + Math.max(18, Math.round((limit - typed) / 4)));
    typewriter.set(shown);
    await clock.wait(110 * tempo);
  }
}

// ---------------------------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------------------------

async function drawBox(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const { width, height } = size(ctx, el);
  agent.verb(job.primary.kind === "image" ? "framing image" : `drawing ${Math.round(width)}×${Math.round(height)}`);
  await agent.travel(at(el, 0, 0));
  await agent.maybeSlip(el);
  const tools = ctx.overlay.flash(new ToolRow(agent.anchor, el, job.primary.kind === "image" ? "I" : "R"), 700);
  void tools;
  const frame = new SelectionFrame(el, { left: 0, top: 0, width: 0, height: 0 }, { grid: true, size: true });
  ctx.overlay.add(frame);
  keep(job, frame);
  state(job).frame = frame;
  const ms = clamp(500 + Math.hypot(width, height) * 0.22, 500, 820) * ctx.tempo;
  await agent.drag(at(el, width, height), ms, (raw) => {
    const t = easeInOut(raw);
    const live = size(ctx, el);
    frame.box = { left: 0, top: 0, width: live.width * t, height: live.height * t };
  });
  frame.box = { left: 0, top: 0, width, height };
  frame.setGrid(false);
  frame.setHandles(true);
  if (job.primary.kind === "image") frame.setPlaceholder(true);
  ctx.overlay.flash(new Floater(agent.anchor, "ab-sparkle"), 520);
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
  await ctx.clock.wait(140 * ctx.tempo);
  const ghost = ghostOf(job, (created) => {
    if (job.actions.includes("ROUND_CORNERS")) created.node.style.borderRadius = "0px";
    if (job.primary.kind === "button") state(job).typewriter = new Typewriter(created.node);
  });
  const vertical = height > width * 2;
  await ctx.clock.tween(isLine ? 280 * ctx.tempo : 260 * ctx.tempo, (raw) => {
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
  const ghost = (job.state as Record<string, unknown>).promoted ? { node: el as HTMLElement } : ghostOf(job);
  agent.verb(`radius ${Math.round(radius)}`);
  await agent.travel(at(el, width - 5, 5));
  const chip = ctx.overlay.add(new Chip(agent.anchor, el, "radius 0", "blue"));
  const inward = Math.min(radius * 0.7, 40);
  await agent.drag(at(el, width - 5 - inward, 5 + inward), 380 * ctx.tempo, (raw) => {
    const r = radius * easeOut(raw);
    ghost.node.style.borderRadius = `${r}px`;
    chip.text = `radius ${Math.round(r)}`;
  });
  ghost.node.style.borderRadius = "";
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
  const ms = clamp(400 + length * 0.25, 400, 800) * ctx.tempo;
  await agent.drag(vertical ? at(el, start.x, length) : at(el, length, start.y), ms, (raw) => {
    line.length = length * easeInOut(raw);
  });
}

// ---------------------------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------------------------

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
  await agent.drag(at(el, width, lineHeight), clamp(260 + width * 0.25, 280, 520) * ctx.tempo, (raw) => {
    frame.box = { left: 0, top: 0, width: width * easeOut(raw), height: lineHeight };
  });
  frame.box = { left: 0, top: 0, width, height };
  const ghost = ghostOf(job, (created) => {
    if (job.actions.includes("RESIZE_TEXT")) {
      created.node.style.transformOrigin = "0 0";
      created.node.style.scale = "0.42";
    }
    neutraliseColours(job, created);
    state(job).typewriter = new Typewriter(created.node);
  });
  void ghost;
}

async function type(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const s = state(job);
  const typewriter = s.typewriter ?? (s.typewriter = new Typewriter(ghostOf(job).node));
  const { height } = size(ctx, el);
  agent.verb("typing…");
  const scale = job.actions.includes("RESIZE_TEXT") && job.step < job.actions.indexOf("RESIZE_TEXT") ? 0.42 : 1;
  await agent.travel(at(el, 3, Math.min(height, job.primary.style.fontSize * 1.1) * scale * 0.7));
  if (job.primary.kind === "button") await agent.click();
  await typeInto(agent, ctx, typewriter, el, typewriter.total - trailingSymbolLength(job));
  if (!job.actions.slice(job.step + 1).some((action) => action === "ADD_SYMBOL")) typewriter.finish();
}

async function resizeText(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const ghost = ghostOf(job);
  const { width, height } = size(ctx, el);
  const final = job.primary.style.fontSize;
  const from = 0.42;
  agent.verb(`resizing ${Math.round(final * from)}→${Math.round(final)}`);
  await agent.travel(at(el, width * from * 0.5, height * from * 0.5));
  await agent.doubleClick();
  const highlight = ctx.overlay.add(new SelectionFrame(el, { left: 0, top: 0, width: width * from, height: height * from }, { handles: true }));
  highlight.node.classList.add("is-text-selection");
  keep(job, highlight);
  await agent.travel(at(el, width * from, height * from));
  const chip = ctx.overlay.add(new Chip(agent.anchor, el, `${job.primary.style.family} ${Math.round(final * from)}`, "blue"));
  const mid = Math.round(final * 0.6);
  await agent.drag(at(el, width, height), clamp(520 + final * 1.5, 560, 900) * ctx.tempo, (raw) => {
    const scale = lerp(from, 1, easeOutBack(raw, 1.2));
    ghost.node.style.scale = scale.toFixed(4);
    highlight.box = { left: 0, top: 0, width: width * scale, height: height * scale };
    const value = Math.round(final * scale);
    chip.text = raw < 0.5 ? `${job.primary.style.family} ${Math.round(final * from)} → ${value}` : `${job.primary.style.family} ${Math.round(final * from)} → ${mid} → ${value}`;
  });
  ghost.node.style.scale = "";
  ghost.node.style.transformOrigin = "";
  highlight.box = { left: 0, top: 0, width, height };
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
    await agent.glide(at(el, rect.left - origin.left + rect.width / 2, rect.top - origin.top + rect.height / 2), 180 * ctx.tempo);
    const popover = ctx.overlay.add(new ColorPopover(agent.anchor, el, item.color, rgbToHex(item.color)));
    await agent.click();
    popover.pick();
    item.el.style.color = "";
    item.el.style.webkitTextFillColor = "";
    await ctx.clock.wait(120 * ctx.tempo);
    ctx.overlay.fadeOut(popover);
  }
  if (!colored.length) {
    ctx.overlay.flash(new ColorPopover(agent.anchor, el, style.color, rgbToHex(style.color)), 520);
    await ctx.clock.wait(220 * ctx.tempo);
  }
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
  const sweep = ctx.overlay.add(new SelectionFrame(el, { left: 0, top: 0, ...size(ctx, el) }));
  sweep.node.className = "ab-sweep";
  await ctx.clock.tween(460 * ctx.tempo, (raw) => {
    const t = easeOut(raw);
    node.style.filter = `blur(${(1 - t) * 10}px) brightness(${1 + (1 - t) * 0.5})`;
    node.style.opacity = String(0.3 + 0.7 * t);
    sweep.node.style.setProperty("--sweep", `${raw * 140 - 20}%`);
  });
  node.style.filter = "";
  node.style.opacity = "1";
  ctx.overlay.remove(sweep);
}

async function dropImage(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  agent.verb("placing image");
  const source = imageSourceOf(el);
  await dragFromTray(agent, ctx, el, source, job.seed);
  const ghost = ghostOf(job, (created) => { created.node.style.opacity = "0"; });
  state(job).frame?.setPlaceholder(false);
  ctx.overlay.flash(new Floater(agent.anchor, "ab-sparkle"), 520);
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
  await agent.drag(at(el, width - 16, height - 12), 240 * ctx.tempo);
  await agent.drag(at(el, width, height), 220 * ctx.tempo);
  await agent.travel(at(el, width / 2, height / 2));
  chip.text = "pan";
  await agent.drag(at(el, width / 2 + 10, height / 2 + 4), 260 * ctx.tempo, (raw) => {
    const t = easeInOut(raw);
    if (image) image.style.objectPosition = `calc(50% + ${(1 - t) * 14}px) calc(50% + ${(1 - t) * 8}px)`;
    else ghost.node.style.translate = `${(1 - t) * -6}px ${(1 - t) * -3}px`;
  });
  if (image) image.style.objectPosition = finalPosition;
  ghost.node.style.translate = "";
  ctx.overlay.fadeOut(chip);
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
      replacement.style.opacity = "0";
      slot.replaceWith(replacement);
      ctx.overlay.flash(new Floater(agent.anchor, "ab-sparkle"), 520);
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
  (job.state as Record<string, unknown>).picker = picker;
  await ctx.clock.wait(140 * ctx.tempo);
}

async function pickSymbol(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const picker = (job.state as Record<string, unknown>).picker as SymbolPicker | undefined;
  if (!picker) return;
  agent.verb("picking symbol");
  const cellAnchor = (index: number): Anchor => {
    const center = picker.cellCenter(index);
    return { el: null, x: picker.position.x + center.x, y: picker.position.y + center.y };
  };
  const wrong = agent.rng.int(2, 3);
  for (let index = 0; index < wrong; index += 1) {
    let cell = agent.rng.int(0, 11);
    if (cell === picker.targetIndex) cell = (cell + 1) % 12;
    await agent.travel(cellAnchor(cell));
    picker.hover(cell);
    await ctx.clock.wait(90 * ctx.tempo);
  }
  await agent.travel(cellAnchor(picker.targetIndex));
  picker.hover(picker.targetIndex);
  await agent.click();
  picker.choose(picker.targetIndex);
  void el;
}

async function dropSymbol(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const picker = (job.state as Record<string, unknown>).picker as SymbolPicker | undefined;
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
  ctx.overlay.flash(new Floater(agent.anchor, "ab-sparkle"), 520);
  // SVG strokes draw themselves in.
  const strokes = Array.from(ghost.node.querySelectorAll<SVGGeometryElement>("path, circle, rect, line, polyline"));
  const lengths = strokes.map((shape) => { try { return shape.getTotalLength(); } catch { return 0; } });
  await ctx.clock.tween(240 * ctx.tempo, (raw) => {
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
  await agent.drag(at(el, width, height), 320 * ctx.tempo, (raw) => {
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
  await ctx.clock.tween(220 * ctx.tempo, (raw) => {
    ghost.node.style.filter = `grayscale(${1 - raw}) brightness(${1 + 0.7 * (1 - raw)})`;
  });
  ghost.node.style.filter = "";
  ctx.overlay.fadeOut(popover);
}

async function addSymbol(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const typewriter = state(job).typewriter;
  const { width, height } = size(ctx, el);
  agent.verb("adding arrow");
  await agent.travel(at(el, width - Math.min(18, width * 0.2), height / 2));
  ctx.overlay.flash(new Chip(agent.anchor, el, "+ ↗", "blue"), 460);
  await agent.click();
  typewriter?.finish();
  ctx.overlay.flash(new Floater(agent.anchor, "ab-sparkle"), 520);
  await ctx.clock.wait(90 * ctx.tempo);
}

// ---------------------------------------------------------------------------------------------
// Copy / paste
// ---------------------------------------------------------------------------------------------

async function copy(agent: Agent, job: Job, ctx: ActionContext) {
  if (!job.copy) return;
  const source = job.copy.source.el;
  const { width, height } = size(ctx, source);
  agent.verb(job.copy.targets.length > 1 ? `copying ×${job.copy.targets.length}` : "copying");
  await agent.travel(at(source, width / 2, height / 2));
  await agent.click();
  const selection = ctx.overlay.add(new SelectionFrame(source, { left: 0, top: 0, width, height }, { handles: true }));
  agent.key("⌘C", source);
  await ctx.clock.wait(200 * ctx.tempo);
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
    agent.key("⌘V", el, simple ? 300 : 520);
    const ghost = createGhost(el, { source: source.el, hideChildLayers: false });
    copies.set(node, ghost);
    const offset = { x: sourceRect.left - targetRect.left + 14, y: sourceRect.top - targetRect.top + 14 };
    const dashed = ctx.overlay.add(new SelectionFrame(el, { left: offset.x, top: offset.y, width, height }, { dashed: true }));
    if (simple) {
      ghost.node.style.translate = "";
      dashed.box = { left: 0, top: 0, width, height };
      await agent.travel(at(el, width / 2, height / 2));
      await ctx.clock.wait(60 * ctx.tempo);
    } else {
      ghost.node.style.translate = `${offset.x}px ${offset.y}px`;
      await agent.travel(at(el, offset.x + width / 2, offset.y + height / 2));
      await agent.drag(at(el, width / 2, height / 2), clamp(300 + Math.hypot(offset.x, offset.y) * 0.25, 320, 620) * ctx.tempo, (raw) => {
        const t = easeInOut(raw);
        ghost.node.style.translate = `${offset.x * (1 - t)}px ${offset.y * (1 - t)}px`;
        dashed.box = { left: offset.x * (1 - t), top: offset.y * (1 - t), width, height };
      });
      ghost.node.style.translate = "";
    }
    const horizontalGap = targetRect.left - (sourceRect.left + sourceRect.width);
    const verticalGap = targetRect.top - (sourceRect.top + sourceRect.height);
    const gap = Math.round(horizontalGap >= 0 ? horizontalGap : verticalGap >= 0 ? verticalGap : Math.abs(targetRect.left - sourceRect.left));
    if (!simple || node === targets[targets.length - 1]) ctx.overlay.flash(new Chip(agent.anchor, el, `gap ${Math.max(0, gap)}`, "blue"), 520);
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
    for (let index = 0; index < pairs.length; index += 1) {
      const { slot, real } = pairs[index];
      if (slot.textContent === real.textContent) continue;
      // Lock the slot's box: new text never moves the siblings inside the ghost.
      if (slot !== ghost.node) {
        slot.style.width = `${slot.offsetWidth}px`;
        slot.style.height = `${slot.offsetHeight}px`;
      }
      if (index >= 1) {
        // The headline slot is retyped by hand; the rest are pasted in one go.
        const fresh = real.cloneNode(true) as HTMLElement;
        fresh.querySelectorAll("[data-layer]").forEach((child) => child.removeAttribute("data-layer"));
        fresh.querySelectorAll(".bm-hidden").forEach((child) => child.classList.remove("bm-hidden"));
        agent.key("⌘V", node.el, 300);
        slot.innerHTML = fresh.innerHTML;
        await ctx.clock.wait(90 * ctx.tempo);
        continue;
      }
      const rect = real.getBoundingClientRect(), origin = ctx.overlay.rect(node.el);
      await agent.travel(at(node.el, rect.left - origin.left + Math.min(rect.width / 2, 40), rect.top - origin.top + rect.height / 2));
      await agent.doubleClick();
      const highlight = ctx.overlay.add(new SelectionFrame(real, { left: 0, top: 0, width: rect.width, height: rect.height }));
      highlight.node.classList.add("is-text-selection");
      agent.key("⌘A", node.el, 380);
      await ctx.clock.wait(120 * ctx.tempo);
      // Select-all, then type the new text over the old.
      const fresh = real.cloneNode(true) as HTMLElement;
      fresh.querySelectorAll("[data-layer]").forEach((child, index) => {
        child.removeAttribute("data-layer");
        const existing = slot.querySelectorAll("[data-ab-i]")[index];
        if (existing) child.setAttribute("data-ab-i", existing.getAttribute("data-ab-i") ?? "");
      });
      fresh.querySelectorAll(".bm-hidden").forEach((child) => child.classList.remove("bm-hidden"));
      slot.innerHTML = fresh.innerHTML;
      if (slot === ghost.node && node.el instanceof HTMLInputElement) slot.setAttribute("placeholder", node.el.placeholder);
      const typewriter = new Typewriter(slot);
      ctx.overlay.remove(highlight);
      await typeInto(agent, ctx, typewriter, node.el, typewriter.total, true);
      typewriter.finish();
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The halftone wordmark
// ---------------------------------------------------------------------------------------------

async function print(agent: Agent, job: Job, ctx: ActionContext) {
  const el = target(job);
  const footer = el.closest(".hwf");
  agent.verb("printing dots");
  const { width, height } = size(ctx, el);
  await agent.travel(at(el, width * 0.03, height * 0.42));
  const chip = ctx.overlay.add(new Chip(agent.anchor, el, "halftone 0%", "blue"));
  await ctx.clock.tween(2300 * ctx.tempo, (raw) => {
    footer?.dispatchEvent(new CustomEvent("hwf:reveal", { detail: raw }));
    const frontier = clamp(raw * (1 + ctx.printSoft) - ctx.printSoft / 2);
    const live = size(ctx, el);
    agent.anchor = at(el, live.width * (0.03 + 0.94 * frontier), live.height * (0.42 + 0.12 * Math.sin(raw * Math.PI * 6)));
    chip.anchor = agent.anchor;
    chip.text = `halftone ${Math.round(raw * 100)}%`;
  });
  footer?.dispatchEvent(new CustomEvent("hwf:reveal", { detail: 1 }));
  ctx.overlay.fadeOut(chip);
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
  PRINT: print
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

/** The element the agent's next action starts at, for the inspector and the tour. */
export function actionVerb(action: ActionName) {
  return action.toLowerCase().replace(/_/g, " ");
}
