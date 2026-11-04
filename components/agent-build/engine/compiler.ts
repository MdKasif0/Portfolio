/**
 * Task compiler: turns the real page into a build plan.
 *
 * Every [data-layer] element becomes a node in a parent-first tree (nearest [data-layer]
 * ancestor = parent). Each node reads its rect and computed styles, because the build must
 * end in exactly those values. Repeated siblings (cards, chips, rows, links, ticks) form
 * groups: the first is built from scratch, the rest are copy-pasted by other agents and
 * retyped. Each remaining node becomes a job: an ordered recipe of actions.
 */

import { hash } from "@/components/agent-build/engine/clock";
import { rememberClass } from "@/components/agent-build/engine/ghost";
import { EXTRA_JOBS, ruleFor, type SceneRule } from "@/components/agent-build/engine/scenes";

export type ActionName =
  | "DRAW_BOX" | "FILL" | "ROUND_CORNERS"
  | "DRAW_TEXTBOX" | "TYPE" | "RESIZE_TEXT" | "STYLE"
  | "DROP_IMAGE" | "CROP"
  | "OPEN_PICKER" | "PICK_SYMBOL" | "DROP" | "SCALE" | "RECOLOR"
  | "ADD_SYMBOL" | "DRAW_LINE"
  | "COPY" | "PASTE" | "RETYPE" | "SWAP_IMAGE"
  | "GRADIENT" | "STROKE" | "ROTATE" | "SLAM" | "MASK"
  | "SLIDER_DEMO" | "MARQUEE" | "STAMP"
  | "QA_CHECK" | "HOVER_PLAY" | "GO_LIVE";

/** Action families the scheduler balances within each camera window. */
export type ActionCategory = "box" | "type" | "image" | "copy" | "symbol" | "resize" | "style" | "motion";
export const CATEGORY: Record<ActionName, ActionCategory> = {
  DRAW_BOX: "box", FILL: "box", ROUND_CORNERS: "box", DRAW_LINE: "box",
  DRAW_TEXTBOX: "type", TYPE: "type", RETYPE: "type",
  RESIZE_TEXT: "resize", SCALE: "resize",
  STYLE: "style", RECOLOR: "style", GRADIENT: "style", SLAM: "style",
  DROP_IMAGE: "image", CROP: "image", SWAP_IMAGE: "image", MASK: "image", STAMP: "image",
  OPEN_PICKER: "symbol", PICK_SYMBOL: "symbol", DROP: "symbol", ADD_SYMBOL: "symbol",
  COPY: "copy", PASTE: "copy",
  STROKE: "motion", ROTATE: "motion", SLIDER_DEMO: "motion", MARQUEE: "motion",
  QA_CHECK: "style", HOVER_PLAY: "motion", GO_LIVE: "motion"
};

export type NodeKind = "frame" | "text" | "image" | "icon" | "button" | "line" | "canvas";

export type NodeStyle = {
  fontSize: number;
  family: string;
  weight: string;
  color: string;
  tracking: string;
  radius: number;
  background: string;
  hasBackground: boolean;
  mixedColors: string[];
};

export interface BuildNode {
  id: string;
  el: HTMLElement | SVGElement;
  kind: NodeKind;
  layerKind: string;
  section: string;
  sectionIndex: number;
  order: number;
  depth: number;
  parent: BuildNode | null;
  children: BuildNode[];
  doc: { x: number; y: number; width: number; height: number };
  fixed: boolean;
  text: string;
  style: NodeStyle;
  instant: boolean;
  /** Part of an ancestor that is built as one piece (absorb rule). */
  absorbed: boolean;
  rule: SceneRule;
  job: Job | null;
}

export type JobStatus = "blocked" | "ready" | "claimed" | "active" | "done";

export interface Job {
  id: string;
  primary: BuildNode;
  /** Every node revealed when the job completes (primary, copy targets, passengers). */
  nodes: BuildNode[];
  actions: ActionName[];
  step: number;
  deps: Set<Job>;
  dependents: Set<Job>;
  status: JobStatus;
  instant: boolean;
  copy: { source: BuildNode; targets: BuildNode[] } | null;
  seed: number;
  section: string;
  sectionIndex: number;
  /** Shared state between a job's actions (ghost, frames, typewriter). */
  state: Record<string, unknown>;
  /**
   * Step after which children may start (a filled frame is enough for its contents);
   * the real element is shown at that point. Defaults to the end of the recipe.
   */
  unlockAfter: number;
  rule: SceneRule;
  /** Dominant action family, for per-window balancing. */
  category: ActionCategory;
  /** Agents currently holding part of this job (pairing and baton passes split it). */
  holders: number;
  /** Not claimable before this build time (new-window stagger). */
  availableAt: number;
}

export interface BuildPlan {
  nodes: BuildNode[];
  jobs: Job[];
  inertBefore: Map<Element, boolean>;
  sections: string[];
  /** Layers shown to the visitor (the counter's total). */
  total: number;
}

export const SECTION_ORDER = ["nav", "top", "work", "collaborators", "recognition", "raw-real", "about", "journey", "contact", "footer"];
const TRAILING_SYMBOL = /\s*([↗↑→▶↓✓+↔])\s*$/;

function sectionOf(element: Element) {
  if (element.closest("header.site-nav")) return "nav";
  if (element.closest("footer")) return "footer";
  return element.closest<HTMLElement>("section[id]")?.id
    ?? element.closest<HTMLElement>("[data-build-section]")?.dataset.buildSection
    ?? "page";
}

function isFixed(element: Element) {
  let node: Element | null = element;
  while (node && node !== document.body) {
    const position = getComputedStyle(node).position;
    if (position === "fixed" || position === "sticky") return true;
    node = node.parentElement;
  }
  return false;
}

function px(value: string) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ownText(element: Element) {
  let text = "";
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent || parent.closest("script, style")) return NodeFilter.FILTER_REJECT;
      const layer = parent.closest("[data-layer]");
      return layer === element ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  let node: Node | null;
  while ((node = walker.nextNode())) text += (node as Text).data;
  return text.replace(/\s+/g, " ").trim();
}

function styleOf(element: Element): NodeStyle {
  const computed = getComputedStyle(element);
  const background = computed.backgroundImage !== "none" ? computed.backgroundImage : computed.backgroundColor;
  const transparent = computed.backgroundColor === "rgba(0, 0, 0, 0)" || computed.backgroundColor === "transparent";
  const mixed = new Set<string>();
  element.querySelectorAll("*").forEach((child) => {
    if (child.closest("[data-layer]") !== element) return;
    if (!child.textContent?.trim()) return;
    const color = getComputedStyle(child).color;
    if (color !== computed.color) mixed.add(color);
  });
  return {
    fontSize: px(computed.fontSize),
    family: computed.fontFamily.split(",")[0].replace(/["']/g, "").replace(/^__|_[0-9a-f]{6}$/g, "").replace(/_Fallback.*/, "").trim(),
    weight: computed.fontWeight,
    color: computed.color,
    tracking: computed.letterSpacing,
    radius: px(computed.borderTopLeftRadius),
    background,
    hasBackground: computed.backgroundImage !== "none" || !transparent || computed.borderTopWidth !== "0px",
    mixedColors: Array.from(mixed)
  };
}

function kindOf(element: Element, layer: string | undefined, text: string, style: NodeStyle): NodeKind {
  if ((element as HTMLElement).dataset?.kind === "canvas") return "canvas";
  if (layer === "card") return "frame";
  if (layer === "image") return "image";
  if (layer === "icon") return "icon";
  if (layer === "button") return "button";
  if (layer === "line") return "line";
  return text || element instanceof HTMLInputElement ? "text" : style.hasBackground ? "frame" : "line";
}

function recipeFor(node: BuildNode): ActionName[] {
  if (node.rule.recipe) return [...node.rule.recipe];
  const { kind, style, text, el } = node;
  if (kind === "canvas") return ["DRAW_BOX", "STAMP"];
  if (kind === "frame") return style.radius > 1 ? ["DRAW_BOX", "FILL", "ROUND_CORNERS"] : ["DRAW_BOX", "FILL"];
  if (kind === "image") return el.querySelector("img") || el instanceof HTMLImageElement ? ["DRAW_BOX", "DROP_IMAGE", "CROP"] : ["DRAW_BOX", "DROP_IMAGE"];
  if (kind === "icon") return ["DROP", "SCALE", "RECOLOR"];
  if (kind === "line") return ["DRAW_LINE", "FILL"];
  if (kind === "button") {
    const recipe: ActionName[] = ["DRAW_BOX", "FILL"];
    if (text && !(el instanceof HTMLSelectElement)) recipe.push("TYPE");
    if (TRAILING_SYMBOL.test(text)) recipe.push("ADD_SYMBOL");
    return recipe;
  }
  const recipe: ActionName[] = ["DRAW_TEXTBOX", "TYPE"];
  if (style.fontSize >= 22) recipe.push("RESIZE_TEXT");
  if (style.fontSize >= 22 || style.mixedColors.length) recipe.push("STYLE");
  return recipe;
}

function categoryOf(actions: ActionName[]): ActionCategory {
  const counts = new Map<ActionCategory, number>();
  for (const action of actions) counts.set(CATEGORY[action], (counts.get(CATEGORY[action]) ?? 0) + 1);
  // Prefer the family that makes the job distinctive (a text job is "type", an icon "symbol").
  const order: ActionCategory[] = ["copy", "image", "symbol", "resize", "type", "motion", "style", "box"];
  return order.find((category) => counts.has(category)) ?? "box";
}

/** Climb single-child wrappers so siblings in <li>s still group (footer links, chips). */
function groupContainer(element: Element) {
  let node: Element = element;
  while (node.parentElement && node.parentElement.children.length === 1 && node.parentElement !== document.body) node = node.parentElement;
  return node.parentElement;
}

export function compilePlan(): BuildPlan {
  const elements = Array.from(document.querySelectorAll<HTMLElement | SVGElement>("[data-layer]")).filter((element) => !element.closest("[data-ab-ghost]"));
  const sectionIndex = new Map(SECTION_ORDER.map((section, index) => [section, index]));
  const byElement = new Map<Element, BuildNode>();
  const viewportWidth = window.innerWidth;

  const nodes = elements.map((el, order): BuildNode => {
    const rect = el.getBoundingClientRect();
    const fixed = isFixed(el);
    const style = styleOf(el);
    const text = ownText(el);
    const computed = getComputedStyle(el);
    const section = sectionOf(el);
    const svgInternal = el instanceof SVGElement && !(el instanceof SVGSVGElement);
    const node: BuildNode = {
      id: `${section}-${order}`,
      el,
      kind: kindOf(el, el.dataset.layer, text, style),
      layerKind: el.dataset.kind || el.dataset.layer || "layer",
      section,
      sectionIndex: sectionIndex.get(section) ?? 99,
      order,
      depth: 0,
      parent: null,
      children: [],
      doc: { x: rect.left + (fixed ? 0 : window.scrollX), y: rect.top + (fixed ? 0 : window.scrollY), width: rect.width, height: rect.height },
      fixed,
      text,
      style,
      instant: svgInternal || rect.width < 1 || rect.height < 1 || rect.right < 0 || rect.left > viewportWidth || computed.opacity === "0" || computed.visibility === "hidden",
      absorbed: false,
      rule: ruleFor(el, el.dataset.kind || el.dataset.layer || "layer"),
      job: null
    };
    byElement.set(el, node);
    return node;
  });

  for (const node of nodes) {
    const parentEl = node.el.parentElement?.closest("[data-layer]");
    const parent = parentEl ? byElement.get(parentEl) ?? null : null;
    node.parent = parent;
    parent?.children.push(node);
  }
  for (const node of nodes) {
    let depth = 0, parent = node.parent;
    while (parent) { depth += 1; parent = parent.parent; }
    node.depth = depth;
    // Children of instant parents are invisible too (clipped carousel cards, hidden wrappers).
    if (node.parent?.instant && node.kind !== "canvas") node.instant = true;
  }
  // Parents before children (depth order is stable within a section).
  for (const node of [...nodes].sort((a, b) => a.depth - b.depth)) {
    if (node.parent?.instant) node.instant = true;
    if (node.parent && (node.parent.rule.absorb || node.parent.absorbed)) node.absorbed = true;
  }

  const covered = new Set<BuildNode>();
  const subtree = (root: BuildNode) => {
    const all: BuildNode[] = [];
    const visit = (node: BuildNode) => { all.push(node); node.children.forEach(visit); };
    visit(root);
    return all;
  };

  // ---- Repeated groups → copy jobs ---------------------------------------------------------
  const groups = new Map<string, BuildNode[]>();
  const containerIds = new Map<Element, number>();
  for (const node of nodes) {
    if (node.instant || node.absorbed || node.kind === "canvas" || node.rule.noGroup || node.rule.container) continue;
    const container = groupContainer(node.el);
    if (!container) continue;
    if (!containerIds.has(container)) containerIds.set(container, containerIds.size);
    const key = `${node.layerKind}|${node.el.tagName}|${containerIds.get(container)}|${node.parent?.id ?? "root"}`;
    const group = groups.get(key) ?? [];
    group.push(node);
    groups.set(key, group);
  }

  const jobs: Job[] = [];
  const makeJob = (primary: BuildNode, actions: ActionName[], extra: Partial<Job> = {}): Job => {
    const job: Job = {
      id: `job-${jobs.length}`,
      primary,
      nodes: [primary],
      actions,
      step: 0,
      deps: new Set(),
      dependents: new Set(),
      status: "blocked",
      instant: false,
      copy: null,
      seed: hash(primary.id),
      section: primary.section,
      sectionIndex: primary.sectionIndex,
      state: {},
      unlockAfter: actions.length - 1,
      rule: primary.rule,
      category: categoryOf(actions),
      holders: 0,
      availableAt: 0,
      ...extra
    };
    jobs.push(job);
    return job;
  };

  const copyJobs: Job[] = [];
  const orderedGroups = Array.from(groups.values())
    .filter((group) => group.length >= 2)
    .sort((a, b) => a[0].depth - b[0].depth || a[0].order - b[0].order);
  for (const group of orderedGroups) {
    const members = group.filter((node) => !covered.has(node));
    if (members.length < 2) continue;
    const [leader, ...copies] = members;
    const simple = copies.every((node) => !node.children.length && node.doc.width * node.doc.height < 2000);
    const batchSize = simple ? 3 : 1;
    for (let index = 0; index < copies.length; index += batchSize) {
      const targets = copies.slice(index, index + batchSize);
      const job = makeJob(targets[0], ["COPY", "PASTE"], { copy: { source: leader, targets } });
      const texts = targets.some((target) => subtree(target).some((node) => node.text && node.kind !== "icon"));
      if (texts) job.actions.push("RETYPE");
      if (targets.some((target) => subtree(target).some((node) => node.kind === "image"))) job.actions.push("SWAP_IMAGE");
      // Award rows: the red years are slammed in after the retype.
      if (targets.some((target) => target.el.querySelector(".recognition-year"))) job.actions.push("SLAM");
      job.category = "copy";
      job.nodes = targets.flatMap(subtree);
      job.nodes.forEach((node) => { covered.add(node); node.job = job; });
      copyJobs.push(job);
    }
  }

  // ---- Everything else: one job per node ----------------------------------------------------
  for (const node of nodes) {
    if (covered.has(node) || node.instant || node.absorbed) continue;
    if (node.rule.container) {
      node.job = makeJob(node, [], { instant: true });
      continue;
    }
    const job = makeJob(node, recipeFor(node));
    if (node.kind === "frame" && node.children.length && job.actions[2] === "ROUND_CORNERS") job.unlockAfter = 1;
    // Real assists on big type: one agent types while a second resizes; coloured words get a styling partner.
    if (!job.rule.pair && job.actions.includes("RESIZE_TEXT") && node.style.fontSize >= 40) job.rule = { ...job.rule, pair: "resize" };
    else if (!job.rule.pair && job.actions.includes("STYLE") && node.style.mixedColors.length) job.rule = { ...job.rule, pair: "style" };
    node.job = job;
  }
  // Instant and absorbed nodes ride along with the nearest ancestor job; orphans get an agentless job.
  for (const node of nodes) {
    if (!(node.instant || node.absorbed) || node.job) continue;
    let ancestor = node.parent;
    while (ancestor && !ancestor.job) ancestor = ancestor.parent;
    if (ancestor?.job) {
      node.job = ancestor.job;
      ancestor.job.nodes.push(node);
    } else {
      const job = makeJob(node, [], { instant: true });
      node.job = job;
    }
  }
  // ---- Dependencies: parent's job first; copies wait for their whole leader subtree --------
  const link = (job: Job, dep: Job | null | undefined) => {
    if (!dep || dep === job) return;
    job.deps.add(dep);
    dep.dependents.add(job);
  };
  for (const job of jobs) {
    if (job.copy) {
      for (const node of subtree(job.copy.source)) link(job, node.job);
      for (const target of job.copy.targets) link(job, target.parent?.job);
    } else {
      link(job, job.primary.parent?.job);
    }
  }
  // Scene ordering: "after" kinds in the same section, and "last" waits for the whole page.
  for (const job of jobs) {
    const after = job.rule.after;
    if (after) for (const other of jobs) if (other !== job && other.section === job.section && after.includes(other.primary.layerKind)) link(job, other);
  }
  for (const extra of EXTRA_JOBS) {
    const el = document.querySelector<HTMLElement>(extra.selector);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const section = sectionOf(el);
    const node: BuildNode = {
      id: `${section}-${extra.kind}`, el, kind: "frame", layerKind: extra.kind, section, sectionIndex: sectionIndex.get(section) ?? 99,
      order: nodes.length, depth: 0, parent: null, children: [],
      doc: { x: rect.left + window.scrollX, y: rect.top + window.scrollY, width: rect.width, height: rect.height },
      fixed: false, text: "", style: styleOf(el), instant: false, absorbed: false, rule: { after: extra.after }, job: null
    };
    const job = makeJob(node, [...extra.recipe], { nodes: [] });
    node.job = job;
    for (const other of jobs) if (other !== job && other.section === section && extra.after.includes(other.primary.layerKind)) link(job, other);
  }
  for (const job of jobs) {
    if (!job.rule.last) continue;
    for (const other of jobs) if (other !== job && !other.instant) link(job, other);
  }
  for (const job of jobs) if (!job.deps.size) job.status = "ready";

  // Hide every layer the build will reveal (the halftone canvas is printed in place instead).
  const inertBefore = new Map<Element, boolean>();
  for (const node of nodes) {
    if (node.kind === "canvas") continue;
    if (node.el instanceof HTMLElement) inertBefore.set(node.el, node.el.inert);
    rememberClass(node.el);
    node.el.classList.add("bm-hidden");
    if (node.el instanceof HTMLElement) node.el.inert = true;
  }

  jobs.sort((a, b) => a.sectionIndex - b.sectionIndex || a.primary.doc.y - b.primary.doc.y || a.primary.doc.x - b.primary.doc.x);
  const sections = Array.from(new Set(nodes.map((node) => node.section))).sort((a, b) => (sectionIndex.get(a) ?? 99) - (sectionIndex.get(b) ?? 99));
  return { nodes, jobs, inertBefore, sections, total: nodes.length };
}
