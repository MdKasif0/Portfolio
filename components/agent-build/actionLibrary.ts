import type { BuildAction, BuildLayer, TaskDetails } from "./types";
import { buildModeConfig } from "./buildMode.config";

export const ACTION_VERBS: Record<BuildAction, string> = {
  DRAW_BOX: "drawing frame…",
  FILL: "filling color…",
  ROUND_CORNERS: "rounding corners…",
  DRAW_TEXTBOX: "drawing text box…",
  TYPE: "typing…",
  RESIZE_TEXT: "resizing text…",
  STYLE: "styling text…",
  DROP_IMAGE: "dropping asset…",
  CROP: "cropping image…",
  COPY_PASTE: "pasting component…",
  RETYPE: "retyping text…",
  SWAP_IMAGE: "swapping image…",
  OPEN_PICKER: "opening symbols…",
  PICK_SYMBOL: "picking glyph…",
  DROP: "placing icon…",
  SCALE: "scaling icon…",
  RECOLOR: "recoloring…",
  ADD_SYMBOL: "adding arrow…",
  DRAW_LINE: "drawing line…"
};

export const ACTION_TOOLS: Record<BuildAction, string> = {
  DRAW_BOX: "R",
  FILL: "Fill",
  ROUND_CORNERS: "Radius",
  DRAW_TEXTBOX: "T",
  TYPE: "Type",
  RESIZE_TEXT: "Size",
  STYLE: "Style",
  DROP_IMAGE: "I",
  CROP: "Crop",
  OPEN_PICKER: "/",
  PICK_SYMBOL: "Symbols",
  DROP: "Drop",
  SCALE: "Scale",
  RECOLOR: "Color",
  ADD_SYMBOL: "↗",
  DRAW_LINE: "Line",
  COPY_PASTE: "⌘V",
  RETYPE: "Retype",
  SWAP_IMAGE: "Swap"
};

export const SYMBOL_GLYPHS = [
  "↗", "*", "⌖", "▶",
  "“", "©", "•", "+",
  "→", "↓", "✓", "⌘"
];

const hash = (value: string, seed = buildModeConfig.seed): number =>
  value.split("").reduce<number>((result, char) => (result * 31 + char.charCodeAt(0)) >>> 0, seed);

/**
 * Builds task details including human touches (hesitation, tremor, typo, overshoot)
 */
/**
 * Builds task details including human touches (hesitation, tremor, typo, overshoot)
 * and tailored scene behaviors.
 */
export function buildTaskDetails(
  action: BuildAction,
  layer: BuildLayer,
  taskIndex: number,
  seed: number,
  agentId = 0
): TaskDetails {
  let verb = ACTION_VERBS[action] || "building…";
  const toolShortcut = ACTION_TOOLS[action] || "V";
  const taskSeed = hash(`${seed}:${layer.id}:${action}:${taskIndex}`);

  // Agent personalities: 0 = fast_sloppy, 1 = slow_precise, 2 = showy
  const personality = agentId % 3;
  const isFastSloppy = personality === 0;
  const isSlowPrecise = personality === 1;
  const isShowy = personality === 2;

  // Human touches tuned per personality
  const hesitationMs = isSlowPrecise
    ? 140 + (taskSeed % 80)
    : 70 + (taskSeed % 90);
  const overshootPx = isFastSloppy ? 3 + (taskSeed % 4) : 0;
  const tremorPx = isFastSloppy ? 0.38 : isSlowPrecise ? 0.15 : 0.25;
  const isMistakeRedo = isFastSloppy && (taskSeed % 20) === 0;

  const isNudge = isSlowPrecise && (taskSeed % 12) === 0;

  const details: TaskDetails = {
    verb,
    toolShortcut,
    hesitationMs,
    overshootPx,
    tremorPx,
    isMistakeRedo,
    keycap: isMistakeRedo ? "⌘Z" : undefined
  };

  const textUpper = layer.text.toUpperCase();
  const isHero = layer.section === "top" || layer.section === "hero" || layer.section === "nav";
  const isPortfolioWordmark = textUpper.includes("PORTFOLIO");
  const isWork = layer.section === "work";
  const isCollab = layer.section === "collaborators";
  const isRecognition = layer.section === "recognition";
  const isRawReal = layer.section === "raw-real";
  const isAbout = layer.section === "about";
  const isJourneyOrContact = layer.section === "journey" || layer.section === "contact" || layer.section === "footer";

  switch (action) {
    case "DRAW_BOX":
    case "DRAW_TEXTBOX":
      if (isPortfolioWordmark) verb = "drawing title frame…";
      else if (layer.type === "card") verb = "drawing card frame…";
      else if (layer.type === "button") verb = "drawing button box…";
      break;

    case "FILL":
      if (layer.type === "button") {
        details.hex = "#E5322D";
        verb = "filling coral accent…";
      } else if (isRecognition) {
        details.hex = "#1A080A";
        verb = "filling wine gradient…";
      } else {
        details.hex = layer.textStyle.backgroundColor !== "rgba(0, 0, 0, 0)" && layer.textStyle.backgroundColor
          ? layer.textStyle.backgroundColor
          : "#0B0B12";
      }
      break;

    case "ROUND_CORNERS":
      details.radius = Number.parseInt(layer.textStyle.borderRadius) || 16;
      verb = `rounding corners (${details.radius}px)…`;
      break;

    case "TYPE":
    case "RETYPE": {
      const text = layer.text;
      const hasTypo = (taskSeed % 38) === 0 && text.length > 5;
      details.hasTypo = hasTypo;
      if (hasTypo) {
        details.typoIndex = 2 + (taskSeed % Math.max(1, Math.min(text.length - 2, 20)));
        const origChar = text[details.typoIndex] || "e";
        details.typoChar = origChar === "e" ? "r" : origChar === "a" ? "s" : "x";
        details.keycap = "⌫";
      }
      if (isPortfolioWordmark) verb = "typing PORTFOLIO…";
      else if (textUpper.includes("KASIF")) verb = "typing KASIF.…";
      else if (action === "RETYPE") verb = "retyping title…";
      break;
    }

    case "RESIZE_TEXT": {
      const parsedSize = Number.parseInt(layer.textStyle.fontSize) || 16;
      if (isPortfolioWordmark) {
        details.initialFontSize = 40;
        details.finalFontSize = 380;
        details.fontFamily = "Anton";
        verb = "resizing Anton 40 → 380…";
      } else if (isRecognition && (textUpper.includes("+") || parsedSize > 32)) {
        details.initialFontSize = 24;
        details.finalFontSize = 120;
        details.fontFamily = "Anton";
        verb = "scaling giant metric…";
      } else {
        details.finalFontSize = parsedSize;
        details.initialFontSize = Math.max(10, Math.round(parsedSize * 0.4));
        details.fontFamily = layer.textStyle.fontFamily.split(",")[0].replaceAll(/['"]/g, "").trim();
      }
      break;
    }

    case "STYLE":
      details.weight = layer.textStyle.fontWeight;
      details.hex = layer.textStyle.color || "#FFFFFF";
      details.tracking = layer.textStyle.letterSpacing || "normal";
      if (isPortfolioWordmark) {
        details.hex = "#E5322D";
        verb = "painting red gradient…";
      } else if (isCollab) {
        verb = "dragging speed handle (1.0x)…";
      } else if (isRawReal) {
        verb = "sliding reveal handle (100%)…";
      } else if (isRecognition && textUpper.match(/\d{4}/)) {
        verb = "slamming award year…";
      }
      break;

    case "COPY_PASTE":
      details.keycap = "⌘V";
      details.gap = 24;
      if (isWork) verb = "cloning card (snap gap 24px)…";
      else if (isAbout) verb = "fan pasting toolkit chip…";
      else verb = "pasting component (gap 24px)…";
      break;

    case "DROP_IMAGE":
    case "SWAP_IMAGE":
      if (isHero) verb = "dropping cutout asset…";
      else if (isWork) verb = "swapping card thumbnail…";
      else if (isCollab) verb = "placing client logo…";
      else verb = "dropping asset from tray…";
      break;

    case "CROP":
      if (isHero) verb = "cropping mask scanline…";
      else verb = "adjusting crop handles…";
      break;

    case "OPEN_PICKER":
    case "PICK_SYMBOL":
    case "DROP":
    case "SCALE":
    case "RECOLOR":
    case "ADD_SYMBOL":
      if (isRecognition) {
        details.symbolGlyph = "🌿";
        verb = "scaling laurel glyph…";
      } else if (layer.type === "button") {
        details.symbolGlyph = "↓";
        verb = "adding CTA arrow (↓)…";
      } else if (textUpper.includes("PLAY") || layer.textStyle.borderRadius.includes("50%")) {
        details.symbolGlyph = "▶";
        verb = "inserting play icon…";
      } else {
        details.symbolGlyph = SYMBOL_GLYPHS[taskSeed % SYMBOL_GLYPHS.length];
      }
      details.hex = layer.textStyle.color || "#FFFFFF";
      break;

    case "DRAW_LINE":
      details.length = Math.round(layer.rect.width || layer.rect.height || 1200);
      if (isAbout) verb = "drawing timeline track…";
      break;

    default:
      break;
  }

  // Nudge micro-interaction
  if (isNudge && !details.keycap) {
    details.keycap = taskSeed % 2 === 0 ? "→ 1px" : "↑ 2px";
  }

  details.verb = verb;
  return details;
}

/**
 * Calculates deterministic action durations based on layer geometry & text
 */
export function calculateActionDuration(
  action: BuildAction,
  layer: BuildLayer,
  seed: number,
  mobile: boolean
): number {
  const durationScale = mobile ? buildModeConfig.mobileActionTimeScale : 1;

  switch (action) {
    case "DRAW_BOX":
    case "DRAW_TEXTBOX": {
      // 500 - 900ms as requested in spec
      const base = 520 + (seed % 280);
      return base * durationScale;
    }
    case "TYPE":
    case "RETYPE": {
      const charCount = Math.min(layer.text.length, 120);
      // 22-45ms per character
      const perChar = 24 + (seed % 16);
      const baseDuration = Math.max(260, charCount * perChar);
      return baseDuration * durationScale;
    }
    case "RESIZE_TEXT":
      return 360 * durationScale;
    case "FILL":
      return 220 * durationScale;
    case "ROUND_CORNERS":
      return 240 * durationScale;
    case "STYLE":
      return 220 * durationScale;
    case "DROP_IMAGE":
    case "SWAP_IMAGE":
      return 380 * durationScale;
    case "CROP":
      return 300 * durationScale;
    case "COPY_PASTE":
      return 280 * durationScale;
    case "OPEN_PICKER":
    case "PICK_SYMBOL":
      return 240 * durationScale;
    case "DROP":
    case "SCALE":
    case "RECOLOR":
    case "ADD_SYMBOL":
      return 220 * durationScale;
    case "DRAW_LINE":
      return 360 * durationScale;
    default:
      return 200 * durationScale;
  }
}
