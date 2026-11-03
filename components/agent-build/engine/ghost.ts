/**
 * Ghost proxies. The real element keeps its layout space but stays hidden (opacity 0 +
 * inert, via .bm-hidden). The build plays on a clone inserted right after it, absolutely
 * positioned on the original's exact box. Because the clone sits in the same parent it
 * inherits the page's CSS context (fonts, colours, nested spans like the red period), so
 * when the recipe ends the ghost is removed and the real element shown in the same
 * frame, pixel-identical and with zero layout shift (absolute nodes shift nothing).
 */

const GHOST_ATTRS = ["id", "data-layer", "data-kind", "data-magnetic", "data-magnetic-variant", "data-cursor-label", "data-cursor-zone", "data-build-section", "data-scene", "name", "for", "aria-controls", "aria-labelledby"];

function scrub(root: Element) {
  const all = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const node of all) {
    node.classList.remove("bm-hidden", "agent-layer-revealed");
    for (const attribute of GHOST_ATTRS) node.removeAttribute(attribute);
    if (node instanceof HTMLElement || node instanceof SVGElement) node.removeAttribute("tabindex");
  }
}

export type Ghost = {
  node: HTMLElement;
  original: Element;
  remove(): void;
};

type GhostOptions = {
  /** Hide nested [data-layer] children (they get their own recipes). Default true. */
  hideChildLayers?: boolean;
  /** Use this element's content instead of the original's (copy-paste). */
  source?: Element;
};

/** Clone `original` (or `source`) into an absolutely positioned ghost on top of `original`'s box. */
export function createGhost(original: Element, options: GhostOptions = {}): Ghost {
  const from = options.source ?? original;
  const marked: Element[] = [];
  if (options.hideChildLayers !== false) {
    from.querySelectorAll("[data-layer]").forEach((child) => {
      child.setAttribute("data-ab-skip", "");
      marked.push(child);
    });
  }
  from.querySelectorAll("[data-layer]").forEach((child, index) => child.setAttribute("data-ab-i", String(index)));
  const clone = from.cloneNode(true) as HTMLElement;
  marked.forEach((child) => child.removeAttribute("data-ab-skip"));
  from.querySelectorAll("[data-ab-i]").forEach((child) => child.removeAttribute("data-ab-i"));

  scrub(clone);
  clone.querySelectorAll<HTMLElement | SVGElement>("[data-ab-skip]").forEach((child) => {
    child.style.visibility = "hidden";
  });
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("inert", "");
  clone.setAttribute("data-ab-ghost", "");
  clone.style.pointerEvents = "none";
  clone.style.transition = "none";

  const computed = getComputedStyle(original);
  const fixed = computed.position === "fixed";
  const box = original instanceof HTMLElement
    ? { width: original.offsetWidth, height: original.offsetHeight }
    : (() => { const rect = original.getBoundingClientRect(); return { width: rect.width, height: rect.height }; })();
  Object.assign(clone.style, {
    position: fixed ? "fixed" : "absolute",
    margin: "0",
    left: "0px",
    top: "0px",
    right: "auto",
    bottom: "auto",
    boxSizing: "border-box",
    width: `${box.width}px`,
    height: `${box.height}px`,
    maxWidth: "none",
    zIndex: computed.zIndex === "auto" ? "1" : computed.zIndex,
    opacity: "1",
    visibility: "visible"
  });
  if (clone instanceof SVGElement) {
    clone.setAttribute("width", String(box.width));
    clone.setAttribute("height", String(box.height));
  }
  original.after(clone);

  // One read/write correction lands the clone exactly on the original (transforms included).
  const target = original.getBoundingClientRect();
  const placed = clone.getBoundingClientRect();
  clone.style.left = `${target.left - placed.left}px`;
  clone.style.top = `${target.top - placed.top}px`;

  return {
    node: clone,
    original,
    remove: () => clone.remove()
  };
}

/** The clone's counterpart of the source's index-th nested [data-layer] element. */
export function ghostChild(ghost: Ghost, index: number) {
  return ghost.node.querySelector<HTMLElement>(`[data-ab-i="${index}"]`);
}

/** Show the real element(s) in the same frame the ghost goes, without replaying transitions. */
export function reveal(elements: Element[], inertBefore: Map<Element, boolean>) {
  for (const element of elements) {
    if (element instanceof HTMLElement || element instanceof SVGElement) element.style.setProperty("transition", "none", "important");
    element.classList.remove("bm-hidden");
    if (element instanceof HTMLElement) element.inert = inertBefore.get(element) ?? false;
  }
  requestAnimationFrame(() => {
    for (const element of elements) if (element instanceof HTMLElement || element instanceof SVGElement) element.style.removeProperty("transition");
  });
}

/**
 * Types into the ghost's own text nodes, so nested styling (red period, italic word)
 * survives. The untyped rest of each text node stays in the layout inside an invisible
 * span, so typing never reflows anything (no layout shift); only visibility changes.
 * Text inside hidden child layers is left alone.
 */
export class Typewriter {
  private nodes: { node: Text; full: string; rest: HTMLSpanElement }[] = [];
  private placeholder: { el: HTMLInputElement | HTMLTextAreaElement; full: string } | null = null;
  readonly total: number;
  shown = 0;
  private lastIndex = 0;

  constructor(root: Element) {
    if (root instanceof HTMLInputElement || root instanceof HTMLTextAreaElement) {
      this.placeholder = { el: root, full: root.placeholder || root.value };
      root.placeholder = "";
      root.value = "";
      this.total = this.placeholder.full.length;
    } else {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => node.parentElement?.closest("[data-ab-skip], script, style, svg") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
      });
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node as Text;
        if (!text.data.length) continue;
        const rest = document.createElement("span");
        rest.className = "ab-rest";
        this.nodes.push({ node: text, full: text.data, rest });
      }
      for (const item of this.nodes) {
        item.rest.textContent = item.full;
        item.node.data = "";
        item.node.after(item.rest);
      }
      this.total = this.nodes.reduce((sum, item) => sum + item.full.length, 0);
    }
  }

  /** Viewport rect of the typing position (end of the typed text), for the overlay caret. */
  caretRect(): DOMRect | null {
    if (this.placeholder) {
      const rect = this.placeholder.el.getBoundingClientRect();
      return new DOMRect(rect.left + 8, rect.top + rect.height * 0.25, 0, rect.height * 0.5);
    }
    const item = this.nodes[this.lastIndex];
    if (!item) return null;
    const range = document.createRange();
    if (item.node.data.length) {
      range.setStart(item.node, Math.max(0, item.node.data.length - 1));
      range.setEnd(item.node, item.node.data.length);
    } else {
      range.selectNodeContents(item.rest);
      range.collapse(true);
    }
    const rects = range.getClientRects();
    const rect = rects[rects.length - 1] ?? range.getBoundingClientRect();
    return rect.height ? rect : null;
  }

  get text() {
    return this.placeholder ? this.placeholder.full : this.nodes.map((item) => item.full).join("");
  }

  /** Show `count` characters, plus an optional wrong character at the end (a typo). */
  set(count: number, typo = "") {
    this.shown = Math.max(0, Math.min(this.total, count));
    if (this.placeholder) {
      this.placeholder.el.placeholder = this.placeholder.full.slice(0, this.shown) + typo;
      return;
    }
    let left = this.shown, caretAt = 0;
    this.nodes.forEach((item, index) => {
      const take = Math.min(item.full.length, left);
      left -= take;
      const typed = item.full.slice(0, take);
      if (item.node.data !== typed) item.node.data = typed;
      const rest = item.full.slice(take);
      if (item.rest.textContent !== rest) item.rest.textContent = rest;
      if (take > 0) caretAt = index;
    });
    if (typo && this.nodes[caretAt]) this.nodes[caretAt].node.data += typo;
    this.lastIndex = caretAt;
  }

  finish() {
    this.set(this.total);
    for (const item of this.nodes) item.rest.remove();
  }
}

/** Real image sources on the page, for the asset tray. */
export function pageImageSources(limit = 5) {
  const sources = new Set<string>();
  document.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    const source = image.currentSrc || image.src;
    if (source && !source.startsWith("data:") && isImageUrl(source)) sources.add(source);
  });
  return Array.from(sources).slice(0, limit);
}

/** The first image source inside (or of) an element. */
export function imageSourceOf(element: Element) {
  const image = element instanceof HTMLImageElement ? element : element.querySelector("img");
  if (image) return image.currentSrc || image.src;
  const background = getComputedStyle(element).backgroundImage;
  // Computed styles serialise as url("…"); match the outer one, not a url() nested inside a data URI.
  const match = /^url\("((?:[^"\\]|\\.)*)"\)/.exec(background);
  return match && isImageUrl(match[1]) ? match[1] : "";
}

/** Real image files only: not SVG fragment references like url(#grain). */
function isImageUrl(source: string) {
  try {
    const url = new URL(source, window.location.href);
    return !(url.hash && url.pathname === window.location.pathname) && !source.startsWith("#") && !source.startsWith("%23");
  } catch {
    return false;
  }
}
