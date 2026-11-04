/**
 * The tool chrome: a fixed overlay (viewport coordinates) holding agent cursors and the
 * short-lived pieces of a design tool — selection frames, dimension chips, keycap
 * toasts, colour and symbol popovers, the asset tray. Everything is positioned from
 * anchors (an element plus an offset) re-read once per frame, so it rides along with
 * the tour scroll and with fixed elements like the nav.
 */

import type { Clock } from "@/components/agent-build/engine/clock";

export type Anchor = { el: Element | null; x: number; y: number };
export type Box = { left: number; top: number; width: number; height: number };

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export interface Decoration {
  node: HTMLElement;
  update(overlay: Overlay): void;
}

export class Overlay {
  readonly root: HTMLDivElement;
  private rects = new Map<Element, DOMRect>();
  private decorations = new Set<Decoration>();
  private sparkPool: HTMLElement[] = [];
  tray: AssetTray | null = null;
  /** Set by the quality governor when frames run long: optional chrome (tool rows, sparks) is skipped. */
  lowQuality = false;

  constructor(private clock: Clock) {
    this.root = h("div", "ab-overlay");
    this.root.setAttribute("aria-hidden", "true");
    document.body.appendChild(this.root);
  }

  /** Element rect, read at most once per frame. */
  rect(el: Element): DOMRect {
    let rect = this.rects.get(el);
    if (!rect) {
      rect = el.getBoundingClientRect();
      this.rects.set(el, rect);
    }
    return rect;
  }

  point(anchor: Anchor) {
    if (!anchor.el) return { x: anchor.x, y: anchor.y };
    const rect = this.rect(anchor.el);
    return { x: rect.left + anchor.x, y: rect.top + anchor.y };
  }

  add<T extends Decoration>(decoration: T): T {
    this.decorations.add(decoration);
    this.root.appendChild(decoration.node);
    decoration.update(this);
    return decoration;
  }

  remove(decoration: Decoration | null | undefined) {
    if (!decoration) return;
    this.decorations.delete(decoration);
    decoration.node.remove();
  }

  /** A pooled "+" spark at a point (skipped under the quality governor). */
  spark(point: { x: number; y: number }) {
    if (this.lowQuality) return;
    const node = this.sparkPool.pop() ?? h("span", "ab-sparkle");
    node.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
    node.style.animation = "none";
    this.root.appendChild(node);
    void node.offsetWidth;
    node.style.animation = "";
    this.clock.wait(520).then(() => { node.remove(); this.sparkPool.push(node); }, () => node.remove());
  }

  /** Show a decoration for `ms` of build time without blocking the caller. */
  flash(decoration: Decoration, ms: number) {
    if (this.lowQuality && decoration instanceof ToolRow) return decoration;
    this.add(decoration);
    this.clock.wait(ms).then(() => this.fadeOut(decoration), () => this.remove(decoration));
    return decoration;
  }

  fadeOut(decoration: Decoration, ms = 160) {
    decoration.node.classList.add("is-leaving");
    this.clock.wait(ms).then(() => this.remove(decoration), () => this.remove(decoration));
  }

  /** Clears the per-frame rect cache, then lays out every decoration. */
  render() {
    this.rects.clear();
    Array.from(this.decorations).forEach((decoration) => decoration.update(this));
  }

  destroy() {
    this.decorations.clear();
    this.root.remove();
  }

  viewport(): Box {
    return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  }

  /** A spot for a w×h chip near `point` that never covers `avoid` (the element being built). */
  placeOutside(point: { x: number; y: number }, avoid: Box | null, width: number, height: number) {
    const margin = 8, vw = window.innerWidth, vh = window.innerHeight;
    const clampX = (x: number) => Math.min(vw - width - 6, Math.max(6, x));
    const clampY = (y: number) => Math.min(vh - height - 6, Math.max(6, y));
    if (!avoid) return { x: clampX(point.x + 14), y: clampY(point.y + 16) };
    const candidates = [
      { x: clampX(point.x - width / 2), y: avoid.top - height - margin },
      { x: clampX(point.x - width / 2), y: avoid.top + avoid.height + margin },
      { x: avoid.left + avoid.width + margin, y: clampY(point.y - height / 2) },
      { x: avoid.left - width - margin, y: clampY(point.y - height / 2) }
    ];
    const fits = candidates.find((c) => c.x >= 4 && c.y >= 4 && c.x + width <= vw - 4 && c.y + height <= vh - 4);
    return fits ?? { x: clampX(point.x + 14), y: clampY(avoid.top - height - margin) };
  }
}

const place = (node: HTMLElement, x: number, y: number) => {
  node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
};

/** Blue selection frame with optional handles, live W×H chip, pixel grid and dashed edge. */
export class SelectionFrame implements Decoration {
  node = h("div", "ab-frame");
  private chip: HTMLSpanElement | null = null;
  /** Local box relative to the anchor element's rect (or viewport when el is null). */
  box: Box;
  constructor(public el: Element | null, box: Box, options: { handles?: boolean; grid?: boolean; dashed?: boolean; size?: boolean; placeholder?: boolean; tone?: "blue" | "red" } = {}) {
    this.box = { ...box };
    if (options.handles) this.setHandles(true);
    if (options.grid) this.node.classList.add("has-grid");
    if (options.dashed) this.node.classList.add("is-dashed");
    if (options.placeholder) this.setPlaceholder(true);
    if (options.tone === "red") this.node.classList.add("is-red");
    if (options.size) {
      this.chip = h("span", "ab-dim");
      this.node.appendChild(this.chip);
    }
  }
  setHandles(on: boolean) {
    this.node.querySelectorAll(".ab-handle").forEach((handle) => handle.remove());
    if (!on) return;
    for (const corner of ["tl", "tr", "bl", "br"]) this.node.appendChild(h("i", `ab-handle ${corner}`));
  }
  setPlaceholder(on: boolean) {
    this.node.classList.toggle("is-placeholder", on);
    if (on && !this.node.querySelector(".ab-ph-icon")) {
      const icon = h("span", "ab-ph-icon");
      icon.innerHTML = '<svg viewBox="0 0 16 16" fill="none"><rect x="2" y="2.5" width="12" height="11" rx="1"/><circle cx="5.5" cy="6" r="1.2"/><path d="m3.5 12 3.2-3.1 2.2 1.8 1.7-1.6 2 2.9"/></svg>';
      this.node.appendChild(icon);
    }
  }
  setGrid(on: boolean) {
    this.node.classList.toggle("has-grid", on);
  }
  update(overlay: Overlay) {
    const origin = this.el ? overlay.rect(this.el) : { left: 0, top: 0 };
    const width = Math.max(0, this.box.width), height = Math.max(0, this.box.height);
    place(this.node, origin.left + this.box.left, origin.top + this.box.top);
    this.node.style.width = `${width}px`;
    this.node.style.height = `${height}px`;
    // Children are placed with transforms only, so a growing frame never shifts its handles in layout.
    this.node.querySelectorAll<HTMLElement>(".ab-handle").forEach((handle) => {
      const right = handle.classList.contains("tr") || handle.classList.contains("br");
      const bottom = handle.classList.contains("bl") || handle.classList.contains("br");
      handle.style.transform = `translate(${(right ? width : 0) - 3.5}px, ${(bottom ? height : 0) - 3.5}px)`;
    });
    const icon = this.node.querySelector<HTMLElement>(".ab-ph-icon");
    if (icon) icon.style.transform = `translate(${width / 2 - 11}px, ${height / 2 - 11}px)`;
    if (this.chip) this.chip.textContent = `${Math.round(width)} × ${Math.round(height)}`;
  }
}

/** The text caret, drawn in the overlay at the end of the typed text (never inline, so no reflow). */
export class Caret implements Decoration {
  node = h("i", "ab-caret");
  constructor(public locate: () => DOMRect | null) {}
  update() {
    const rect = this.locate();
    if (!rect) {
      this.node.style.opacity = "0";
      return;
    }
    this.node.style.opacity = "";
    this.node.style.height = `${Math.max(8, rect.height)}px`;
    place(this.node, rect.right, rect.top);
  }
}

/** A small chip (dimension, font size, radius, gap, hex) placed beside a point, off the target. */
export class Chip implements Decoration {
  node: HTMLSpanElement;
  constructor(public anchor: Anchor, public avoid: Element | null, text: string, variant: "blue" | "dark" | "key" | "red" | "green" = "dark") {
    this.node = h("span", `ab-chip is-${variant}`, text);
  }
  set text(value: string) {
    this.node.textContent = value;
  }
  update(overlay: Overlay) {
    const point = overlay.point(this.anchor);
    const avoid = this.avoid ? overlay.rect(this.avoid) : null;
    const spot = overlay.placeOutside(point, avoid, this.node.offsetWidth || 60, this.node.offsetHeight || 18);
    place(this.node, spot.x, spot.y);
  }
}

/** Row of tool chips (V R T I /) with the active tool lit, shown beside the acting cursor. */
export class ToolRow implements Decoration {
  node = h("span", "ab-tools");
  constructor(public anchor: Anchor, public avoid: Element | null, active: string) {
    for (const tool of ["V", "R", "T", "I", "/"]) this.node.appendChild(h("i", tool === active ? "is-on" : "", tool));
  }
  update(overlay: Overlay) {
    const point = overlay.point(this.anchor);
    const avoid = this.avoid ? overlay.rect(this.avoid) : null;
    const spot = overlay.placeOutside(point, avoid, 104, 20);
    place(this.node, spot.x, spot.y);
  }
}

/** Colour popover: swatch + hex, with an eyedropper tick when picked. */
export class ColorPopover implements Decoration {
  node = h("span", "ab-color");
  constructor(public anchor: Anchor, public avoid: Element | null, color: string, label: string) {
    const swatch = h("i", "ab-swatch");
    swatch.style.background = color;
    this.node.append(swatch, h("b", "", label), h("em", "ab-dropper", "⌖"));
  }
  pick() {
    this.node.classList.add("is-picked");
  }
  update(overlay: Overlay) {
    const point = overlay.point(this.anchor);
    const avoid = this.avoid ? overlay.rect(this.avoid) : null;
    const spot = overlay.placeOutside(point, avoid, 120, 24);
    place(this.node, spot.x, spot.y);
  }
}

const GLYPHS = ["↗", "✳", "▶", "●", "★", "◆", "✦", "⌖", "♥", "↓", "→", "+"];

/** 4×3 symbol picker. One cell holds the real symbol (a clone of the target icon). */
export class SymbolPicker implements Decoration {
  node = h("div", "ab-picker");
  cells: HTMLElement[] = [];
  targetIndex: number;
  constructor(public anchor: Anchor, public avoid: Element | null, symbol: Node | null, seed: number) {
    this.targetIndex = seed % 12;
    for (let index = 0; index < 12; index += 1) {
      const cell = h("span", "ab-cell");
      if (index === this.targetIndex && symbol) {
        cell.appendChild(symbol);
        cell.classList.add("is-real");
      } else {
        cell.textContent = GLYPHS[(index + seed) % GLYPHS.length];
      }
      this.cells.push(cell);
      this.node.appendChild(cell);
    }
  }
  hover(index: number) {
    this.cells.forEach((cell, cellIndex) => cell.classList.toggle("is-hover", cellIndex === index));
  }
  choose(index: number) {
    this.cells[index]?.classList.add("is-chosen");
  }
  /** Local centre of a cell, relative to the popover's top-left. */
  cellCenter(index: number) {
    const column = index % 4, row = Math.floor(index / 4);
    return { x: 8 + column * 24 + 11, y: 8 + row * 24 + 11 };
  }
  position = { x: 0, y: 0 };
  update(overlay: Overlay) {
    const point = overlay.point(this.anchor);
    const avoid = this.avoid ? overlay.rect(this.avoid) : null;
    this.position = overlay.placeOutside(point, avoid, 112, 88);
    place(this.node, this.position.x, this.position.y);
  }
}

/** Slim asset tray docked at the right edge, holding real thumbnails from the page. */
export class AssetTray implements Decoration {
  node = h("div", "ab-tray");
  private users = 0;
  thumbs: HTMLElement[] = [];
  constructor(sources: string[]) {
    this.node.appendChild(h("small", "", "ASSETS"));
    const list = sources.length ? sources : [""];
    for (const source of list.slice(0, 5)) {
      const thumb = h("span", "ab-thumb");
      if (source) thumb.style.backgroundImage = `url("${source}")`;
      this.thumbs.push(thumb);
      this.node.appendChild(thumb);
    }
  }
  acquire(overlay: Overlay) {
    this.users += 1;
    if (!this.node.isConnected) overlay.add(this);
    this.node.classList.add("is-open");
  }
  release(overlay: Overlay) {
    this.users = Math.max(0, this.users - 1);
    if (!this.users) {
      this.node.classList.remove("is-open");
      overlay.fadeOut(this, 260);
    }
  }
  /** Viewport centre of a thumbnail. */
  thumbCenter(index: number) {
    const thumb = this.thumbs[index % this.thumbs.length];
    const rect = thumb.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  update() {
    // Docked with CSS; nothing to lay out per frame.
  }
}

/** Floating element (dragged thumbnail, carried symbol, sparkle) at an anchor, or following one. */
export class Floater implements Decoration {
  node: HTMLElement;
  constructor(public anchor: Anchor | (() => Anchor), className: string, content?: string | Node) {
    this.node = h("span", className);
    if (typeof content === "string") this.node.textContent = content;
    else if (content) this.node.appendChild(content);
  }
  update(overlay: Overlay) {
    const point = overlay.point(typeof this.anchor === "function" ? this.anchor() : this.anchor);
    place(this.node, point.x, point.y);
  }
}

/** A line being drawn: grows from its start, with a live length chip. */
export class LineDraw implements Decoration {
  node = h("span", "ab-line");
  private chip = h("span", "ab-dim");
  length = 0;
  constructor(public el: Element, public start: { x: number; y: number }, public vertical: boolean) {
    this.node.appendChild(this.chip);
  }
  update(overlay: Overlay) {
    const rect = overlay.rect(this.el);
    place(this.node, rect.left + this.start.x, rect.top + this.start.y);
    this.node.style.width = this.vertical ? "1px" : `${this.length}px`;
    this.node.style.height = this.vertical ? `${this.length}px` : "1px";
    this.chip.textContent = String(Math.round(this.length));
  }
}

/** A guide line (precise agents snap to it) along one edge of an element. */
export class GuideLine implements Decoration {
  node = h("span", "ab-guide");
  constructor(public el: Element, public edge: "left" | "top") {}
  update(overlay: Overlay) {
    const rect = overlay.rect(this.el);
    if (this.edge === "left") {
      place(this.node, rect.left, rect.top - 40);
      this.node.style.width = "1px";
      this.node.style.height = `${rect.height + 80}px`;
    } else {
      place(this.node, rect.left - 40, rect.top);
      this.node.style.width = `${rect.width + 80}px`;
      this.node.style.height = "1px";
    }
  }
}

/** Baton pass: a short dotted arc from one agent to the one taking over its element. */
export class BatonArc implements Decoration {
  node = h("span", "ab-baton");
  private path: SVGPathElement;
  constructor(public from: () => { x: number; y: number }, public to: () => { x: number; y: number }, color: string) {
    this.node.innerHTML = '<svg width="100%" height="100%" fill="none"><path stroke-width="1.5" stroke-dasharray="3 4" stroke-linecap="round"/></svg>';
    this.path = this.node.querySelector("path") as SVGPathElement;
    this.path.setAttribute("stroke", color);
  }
  update() {
    const a = this.from(), b = this.to();
    const mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 28 - Math.abs(a.x - b.x) * 0.15;
    this.path.setAttribute("d", `M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`);
  }
}

/** The left-edge layers panel: layer names appear as they complete, then get a ✓. */
export class LayersPanel implements Decoration {
  node = h("div", "ab-layers");
  private list = h("ul", "");
  constructor(private rows: number) {
    this.node.append(h("small", "", "LAYERS"), this.list);
  }
  private items: HTMLElement[] = [];
  /** Rows sit in fixed slots moved by transform, so adding names never reflows the panel. */
  push(name: string) {
    const row = this.items.length >= this.rows ? this.items.shift() as HTMLElement : this.list.appendChild(h("li", ""));
    row.className = "";
    row.textContent = "";
    row.append(h("span", "", name), h("b", "", "✓"));
    this.items.push(row);
    this.items.forEach((item, index) => { item.style.transform = `translateY(${index * 11}px)`; });
    void row.offsetWidth;
    row.className = "is-done";
  }
  fade() {
    this.node.classList.add("is-fading");
  }
  update() {
    // Docked with CSS.
  }
}

/** Go live: a red shockwave ring from the click point. */
export class Shockwave implements Decoration {
  node = h("span", "ab-shockwave");
  constructor(public point: { x: number; y: number }) {}
  update() {
    place(this.node, this.point.x, this.point.y);
  }
}
