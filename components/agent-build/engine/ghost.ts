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
  // A copied layer can still have a child mid-build, with that child's ghost beside it. Only the real layers get copied.
  clone.querySelectorAll("[data-ab-ghost]").forEach((ghost) => ghost.remove());
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
  // Insert beside the original so the clone keeps the page's CSS context. A sibling can still
  // change layout through structural selectors (:last-child, +, :nth-child), so check — within
  // this task, before anything paints — and fall back if the page moved.
  const parent = original.parentElement;
  const snapshot = () => {
    const a = original.getBoundingClientRect(), b = parent?.getBoundingClientRect();
    return `${a.left},${a.top},${a.width},${a.height}|${b?.width},${b?.height}`;
  };
  const before = snapshot();
  original.after(clone);
  if (snapshot() !== before) {
    original.before(clone);
    if (snapshot() !== before) {
      clone.remove();
      return detachedGhost(original, clone, fixed, box);
    }
  }

  alignGhost(clone, original);

  return {
    node: clone,
    original,
    remove: () => clone.remove()
  };
}

/** One read/write correction lands the ghost exactly on the original (transforms included). */
export function alignGhost(node: HTMLElement, original: Element) {
  const target = original.getBoundingClientRect();
  const placed = node.getBoundingClientRect();
  node.style.left = `${parseFloat(node.style.left) + target.left - placed.left}px`;
  node.style.top = `${parseFloat(node.style.top) + target.top - placed.top}px`;
}

let detachedLayer: HTMLElement | null = null;

/**
 * Fallback ghost outside the page flow: every element of the clone carries its computed
 * styles inline (so it no longer depends on selectors), placed in a layer at the document origin.
 */
function detachedGhost(original: Element, clone: HTMLElement, fixed: boolean, box: { width: number; height: number }): Ghost {
  const sources = [original, ...Array.from(original.querySelectorAll("*")).filter((node) => !node.closest("[data-ab-ghost]"))];
  const copies = [clone, ...Array.from(clone.querySelectorAll("*"))];
  const skip = new Set(["position", "left", "top", "right", "bottom", "margin", "margin-top", "margin-left", "margin-right", "margin-bottom", "opacity", "visibility", "transition", "animation", "pointer-events", "z-index"]);
  copies.forEach((copy, index) => {
    const from = sources[index];
    if (!from || !(copy instanceof HTMLElement || copy instanceof SVGElement)) return;
    const computed = getComputedStyle(from);
    const own = copy.style.cssText;
    let css = "";
    for (let i = 0; i < computed.length; i += 1) {
      const name = computed[i];
      if (index === 0 && skip.has(name)) continue;
      css += `${name}:${computed.getPropertyValue(name)};`;
    }
    copy.style.cssText = css + (index === 0 ? own : copy.getAttribute("data-ab-skip") !== null ? "visibility:hidden;" : "");
    if (index > 0) copy.style.setProperty("visibility", copy.hasAttribute("data-ab-skip") ? "hidden" : computed.visibility);
  });
  if (!detachedLayer || !detachedLayer.isConnected) {
    detachedLayer = document.createElement("div");
    detachedLayer.setAttribute("data-ab-ghost-layer", "");
    detachedLayer.setAttribute("aria-hidden", "true");
    detachedLayer.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;z-index:50;pointer-events:none;";
    document.body.appendChild(detachedLayer);
  }
  const rect = original.getBoundingClientRect();
  Object.assign(clone.style, {
    position: fixed ? "fixed" : "absolute",
    margin: "0",
    left: `${rect.left + (fixed ? 0 : window.scrollX)}px`,
    top: `${rect.top + (fixed ? 0 : window.scrollY)}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    opacity: "1",
    visibility: "visible",
    pointerEvents: "none"
  });
  detachedLayer.appendChild(clone);
  return { node: clone, original, remove: () => clone.remove() };
}

/** The clone's counterpart of the source's index-th nested [data-layer] element. */
export function ghostChild(ghost: Ghost, index: number) {
  return ghost.node.querySelector<HTMLElement>(`[data-ab-i="${index}"]`);
}

/**
 * Snapshot an element's style attribute; the returned function puts it back byte-for-byte
 * (or removes it if there was none), so the finished DOM matches the page without Build Mode.
 */
export function keepStyle(element: Element) {
  const before = element.getAttribute("style");
  return () => {
    if (before === null) element.removeAttribute("style");
    else if (element.getAttribute("style") !== before) element.setAttribute("style", before);
  };
}

/** Each element's class attribute exactly as it was before Build Mode touched it. */
const classBefore = new WeakMap<Element, string | null>();

export function rememberClass(element: Element) {
  if (!classBefore.has(element)) classBefore.set(element, element.getAttribute("class"));
}

/** Put the class attribute back byte-for-byte when its tokens match the original again. */
export function restoreClass(element: Element) {
  if (!classBefore.has(element)) return;
  const before = classBefore.get(element) ?? null;
  const tokens = (value: string | null) => (value ?? "").split(/\s+/).filter(Boolean).sort().join(" ");
  if (tokens(before) !== tokens(element.getAttribute("class"))) return;
  if (before === null) element.removeAttribute("class");
  else if (element.getAttribute("class") !== before) element.setAttribute("class", before);
}

/** Show the real element(s) in the same frame the ghost goes, without replaying transitions. */
export function reveal(elements: Element[], inertBefore: Map<Element, boolean>) {
  for (const element of elements) {
    rememberClass(element);
    element.classList.add("ab-no-transition");
    element.classList.remove("bm-hidden");
    if (element instanceof HTMLElement) element.inert = inertBefore.get(element) ?? false;
  }
  requestAnimationFrame(() => {
    for (const element of elements) {
      element.classList.remove("ab-no-transition");
      restoreClass(element);
    }
  });
}

/** The typewriter's own nodes use a tag no page rule can match (`.work-all-link span` would restyle a span). */
const TEXT_TAG = "ab-text";

const isTextRunPart = (node: Node | null): node is ChildNode => node instanceof Text || node instanceof Comment;

/**
 * In a flex or grid parent a run of text is one anonymous item, but every element is an item of
 * its own, with its own gap. Wrapping the run keeps it one item however it gets split for typing.
 * Returns false for a run of collapsible whitespace, which is no item at all and must stay that way.
 */
function holdRunTogether(text: Text) {
  const parent = text.parentElement;
  if (!parent || !/flex|grid/.test(getComputedStyle(parent).display)) return true;
  const run: ChildNode[] = [text];
  for (let node = text.previousSibling; isTextRunPart(node); node = node.previousSibling) run.unshift(node);
  for (let node = text.nextSibling; isTextRunPart(node); node = node.nextSibling) run.push(node);
  if (!run.some((node) => node instanceof Text && node.data.trim())) return false;
  const wrapper = document.createElement(TEXT_TAG);
  run[0].before(wrapper);
  wrapper.append(...run);
  return true;
}

/**
 * Types into the ghost's own text nodes, so nested styling (red period, italic word)
 * survives. The untyped rest of each text node stays in the layout inside an invisible
 * span, so typing never reflows anything (no layout shift); only visibility changes.
 * Text inside hidden child layers is left alone.
 */
export class Typewriter {
  private nodes: { node: Text; full: string; rest: HTMLElement }[] = [];
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
      const texts: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if ((node as Text).data.length) texts.push(node as Text);
      }
      for (const text of texts) {
        if (!holdRunTogether(text)) continue;
        const rest = document.createElement(TEXT_TAG);
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
