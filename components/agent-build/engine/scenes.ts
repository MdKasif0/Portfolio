/**
 * Scene scripts: how each part of the portfolio is built. Keys are `data-kind` values
 * (or CSS selectors in SELECTOR_RULES). Anything not listed falls back to the generic
 * recipe for its layer type (see compiler.recipeFor).
 */

import type { ActionName } from "@/components/agent-build/engine/compiler";

export type SceneRule = {
  /** Explicit recipe (ordered actions). */
  recipe?: ActionName[];
  /** Descendant layers ride along: the whole subtree is dropped/built as one piece. */
  absorb?: boolean;
  /** Pure wrapper with nothing of its own to draw: shown as soon as its parent is. */
  container?: boolean;
  /** Never copy-paste this kind; each one is built individually. */
  noGroup?: boolean;
  /** A second agent works the same element at the same time ("resize" while typing) or takes the styling. */
  pair?: "resize" | "style";
  /** Start size shown on the RESIZE_TEXT chip, in px. */
  resizeFrom?: number;
  /** Wait for these kinds (same section) before starting. */
  after?: string[];
  /** Wait for everything else on the page. */
  last?: boolean;
  /** Scheduled after the rest of its window (e.g. the red years "slammed in last"). */
  late?: boolean;
  /** Camera push-in when this completes. */
  hero?: boolean;
  /** Coral outline flash the first time it completes. */
  flash?: boolean;
};

export const KIND_RULES: Record<string, SceneRule> = {
  // 1. Hero
  "portfolio-word-fill": { recipe: ["DRAW_TEXTBOX", "TYPE", "RESIZE_TEXT", "GRADIENT"], pair: "resize", resizeFrom: 40, hero: true, noGroup: true },
  "portfolio-word-outline": { recipe: ["DRAW_TEXTBOX", "TYPE", "RESIZE_TEXT"], resizeFrom: 40, after: ["portfolio-word-fill"], noGroup: true },
  "light-sweep": { container: true },
  avatar: { recipe: ["DRAW_BOX", "DROP_IMAGE", "CROP", "MASK"], absorb: true },
  handwritten: { recipe: ["STROKE", "ROTATE"], noGroup: true },
  "pen-stroke": { recipe: ["STROKE"] },
  "display-name": { container: true },
  "name-letter": { recipe: ["DRAW_TEXTBOX", "TYPE"], noGroup: true },
  "name-period": { recipe: ["DRAW_TEXTBOX", "TYPE", "STYLE"] },
  role: { container: true },
  "role-line": { recipe: ["DRAW_TEXTBOX", "TYPE", "STYLE"], noGroup: true, pair: "style" },
  "primary-cta": { recipe: ["DRAW_BOX", "FILL", "TYPE", "ADD_SYMBOL"] },
  "reel-button": { container: true },
  "reel-progress": { recipe: ["DRAW_BOX", "OPEN_PICKER", "PICK_SYMBOL", "DROP", "RECOLOR"] },
  "glass-chip-cluster": { container: true },
  "stat-number": { recipe: ["DRAW_TEXTBOX", "TYPE", "RESIZE_TEXT"], resizeFrom: 14 },

  // 2. Work grid — a card is frame, image, tag, index, title, subtitle, arrow (+ meta).
  "project-card": { flash: true },
  "project-open": { container: true },
  "project-card-copy": { container: true },
  "project-thumbnail": { recipe: ["DRAW_BOX", "DROP_IMAGE"], absorb: true },
  "project-index": { recipe: ["DRAW_TEXTBOX", "TYPE", "RESIZE_TEXT"], resizeFrom: 18 },
  "work-toolbar": { container: true },

  // 3. Collab strip — logos placed from the tray, then a motion agent starts the marquee.
  "logo-plate": { recipe: ["DRAW_BOX", "DROP_IMAGE"], absorb: true, noGroup: true },

  // 4. Recognition: panel, tally, then the feature card's award; the two smaller cards copy-paste.
  "recognition-panel": { recipe: ["DRAW_BOX", "GRADIENT", "ROUND_CORNERS"], hero: true },
  "recognition-number": { recipe: ["DRAW_TEXTBOX", "TYPE", "RESIZE_TEXT"], resizeFrom: 24, noGroup: true },
  "recognition-feature": { recipe: ["DRAW_BOX", "GRADIENT", "ROUND_CORNERS"], flash: true },
  "recognition-card": { flash: true },
  // The award is the hero: its seal is picked and dropped in, then the result slams in after the rest of the card.
  "recognition-seal": { recipe: ["DRAW_BOX", "OPEN_PICKER", "PICK_SYMBOL", "DROP"], absorb: true },
  "recognition-result": { recipe: ["DRAW_TEXTBOX", "TYPE", "SLAM"], late: true, noGroup: true },

  // 5. Raw → real
  // The browser frame goes first, then its chrome, then both panels drop in and an agent drags the divider.

  // 6. About
  // Panels first; the toolkit chips and process steps then copy-paste, and the line runs through the nodes.
  "education-card": { recipe: ["DRAW_BOX", "GRADIENT", "ROUND_CORNERS"] },
  "toolkit-panel": { recipe: ["DRAW_BOX", "FILL", "ROUND_CORNERS"] },
  "process-card": { recipe: ["DRAW_BOX", "FILL", "ROUND_CORNERS"], flash: true },
  "education-degree": { recipe: ["DRAW_TEXTBOX", "TYPE", "RESIZE_TEXT"], resizeFrom: 18 },
  "process-line": { after: ["process-step"] },
  "process-node": { noGroup: true },
  "about-quote": { recipe: ["DRAW_BOX", "FILL", "ROUND_CORNERS"] },
  "quote-signature": { recipe: ["STROKE"] },

  // 7. Journey, contact, footer
  // Journey: the current-role card and milestones panel come first; the smaller rows copy-paste.
  "journey-current": { recipe: ["DRAW_BOX", "GRADIENT", "ROUND_CORNERS"], flash: true },
  "milestones-panel": { recipe: ["DRAW_BOX", "FILL", "ROUND_CORNERS"] },
  "journey-rail": { after: ["journey-current"] },
  "contact-row": { noGroup: true },
  // The form card first, then its fields; the budget options copy-paste; the send button goes last.
  "project-form": { recipe: ["DRAW_BOX", "GRADIENT", "ROUND_CORNERS"], flash: true },
  "form-submit": { late: true },
  "showreel-card": { recipe: ["DRAW_BOX", "GRADIENT", "ROUND_CORNERS"], flash: true },
  "section-headline-accent": { pair: "style" },
  // Footer: logo dropped in, name and roles typed, link lists copy-paste, then the wordmark is stamped last.
  "footer-logo": { recipe: ["DRAW_BOX", "DROP_IMAGE"] },
  "footer-label": { noGroup: true },
  canvas: { recipe: ["DRAW_BOX", "STAMP"], last: true }
};

/** Class-based rules for layers without a distinctive data-kind. */
export const SELECTOR_RULES: [string, SceneRule][] = [
];

/** Jobs for things that are not layers themselves (the marquee's speed handle). */
export const EXTRA_JOBS: { selector: string; kind: string; recipe: ActionName[]; after: string[] }[] = [
  { selector: ".collab-marquees", kind: "marquee", recipe: ["MARQUEE"], after: ["logo-plate"] }
];

export function ruleFor(element: Element, kind: string): SceneRule {
  for (const [selector, rule] of SELECTOR_RULES) if (element.matches(selector)) return rule;
  return KIND_RULES[kind] ?? {};
}
