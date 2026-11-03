import type { BuildFrame } from "@/components/agent-build/types";

const actLabels = {
  scan: "01 / SCAN",
  blueprint: "02 / BLUEPRINT",
  build: "03 / BUILD",
  polish: "04 / POLISH",
  finale: "05 / FINALE",
  handoff: "06 / HANDOFF"
} as const;

function recipeFor(frame: BuildFrame) {
  const { kind, index, section } = frame.layer;
  const projectPosition = Number(frame.layer.element.closest<HTMLElement>("[data-project-position]")?.dataset.projectPosition ?? 0);
  if (kind === "nav-frame") return "DRAW_BOX / PILL · BLUR 16";
  if (kind === "logo") return "TYPE LOGO · RESIZE";
  if (kind === "nav-link") return `TYPE LINK · COPY / RETYPE ${Math.min(index + 1, 4)}`;
  if (kind === "motion-switch") return "DRAW_BOX · TOGGLE";
  if (kind === "nav-cta") return "STYLE CTA · ARROW ROTATE";
  if (kind === "ruler") return "DRAW_LINE · COPY TICKS";
  if (kind === "glow") return "DRAW_BOX / ELLIPSE · BLUR 120 · RED 18%";
  if (kind === "grid") return "DRAW_LINE × GRID";
  if (kind === "grain") return "STYLE GRAIN · 3.5%";
  if (kind === "section-eyebrow") return "TYPE EYEBROW";
  if (kind === "section-rule") return "DRAW_LINE · 48PX";
  if (kind === "section-headline-accent") return "TYPE · RESIZE TO FINAL · STYLE RED";
  if (kind === "section-headline-line") return "TYPE HEADLINE · RESIZE TO FINAL";
  if (kind === "portfolio-word-fill") return "DRAW_TEXTBOX · TYPE PORTFOLIO · RESIZE ANTON";
  if (kind === "portfolio-word-outline") return "COPY / PASTE WORD · FILL NONE · STROKE 1.5";
  if (kind === "avatar") return "DROP IMAGE · CROP · REMOVE BACKGROUND";
  if (kind === "hud-ring") return "DRAW CIRCLE · COPY / PASTE · ROTATE";
  if (kind === "crop-mark") return "DRAW_LINE · CROP MARK";
  if (kind === "stat-card") return "BUILD CARD · COPY / PASTE · RETYPE";
  if (kind === "marquee-row") return "TYPE PHRASE · COPY / PASTE · SET SPEED";
  if (kind === "glass-chip") return "DRAW BOX · BLUR 12 · TYPE LABEL";
  if (kind === "handwritten") return "PEN TOOL · DRAW STROKE";
  if (kind === "availability") return "DRAW PILL · STYLE STATUS DOT";
  if (kind === "scroll-cue") return "DRAW_LINE · ANIMATE SCROLL CUE";
  if (kind === "filter-segment") return "DRAW_BOX / PILL · TYPE FILTER LABELS";
  if (kind === "filter-tab") return `TYPE FILTER · ${frame.layer.text.slice(0, 20)}`;
  if (kind === "filter-indicator") return "DRAW_BOX · SLIDE RED INDICATOR";
  if (kind === "work-search") return "DRAW_BOX · MAGNIFIER · TYPE ⌘K";
  if (kind === "search-input") return "TYPE SEARCH HINT · LIVE FILTER";
  if (kind === "project-card") return projectPosition === 1
    ? "BUILD CARD FROM SCRATCH · BROWSER CHROME · MOCK"
    : `COPY / PASTE CARD 0${projectPosition} · RETYPE · SWAP MOCK`;
  if (kind === "browser-frame") return projectPosition === 1
    ? "DRAW_BROWSER · INSERT THREE CHROME DOTS"
    : `COPY / PASTE BROWSER · RETINT MOCK 0${projectPosition}`;
  if (kind === "project-mock" || kind === "mock-screen") return `DRAW PRODUCT MOCK · ${frame.layer.element.closest<HTMLElement>("[data-project-position]")?.getAttribute("data-project-position") ?? "DETAILS"}`;
  if (kind === "project-tag") return "STYLE TAG CHIP · TYPE CATEGORY";
  if (kind === "project-index") return `TYPE ${frame.layer.text} · RESIZE 80 → 320`;
  if (kind === "project-title" || kind === "project-description") return `TYPE ${frame.layer.text.slice(0, 24)}`;
  if (kind === "project-meta") return "TYPE CATEGORY · OMIT UNKNOWN YEAR";
  if (kind === "project-arrow") return "INSERT ARROW · STYLE HOVER CIRCLE";
  if (kind === "project-stack-chip") return "COPY / PASTE · RETYPE TECH CHIP";
  if (kind === "view-all") return "TYPE VIEW ALL · EXPAND GRID";
  if (kind === "carousel-prev" || kind === "carousel-next") return "DRAW_CIRCLE · INSERT ARROW";
  if (kind === "carousel-progress" || kind === "carousel-progress-value") return "DRAW_LINE · SCROLL PROGRESS";
  if (kind === "logo-plate") return `DROP_WORDMARK · COPY / PASTE ×6 · ${frame.layer.text.slice(0, 16)}`;
  if (kind === "collaboration-logo") return "TYPE WORDMARK · JAKARTA BOLD";
  if (kind === "recognition-count") return "OPEN_PICKER → PICK_SYMBOL → SCALE → RECOLOR LAUREL";
  if (kind === "recognition-number") return "TYPE + RESIZE · CENTER COUNT IN LAUREL";
  if (kind === "recognition-row") return index % 3 === 0
    ? "BUILD LEDGER ROW · TYPE + BADGE SYMBOL INSERT"
    : "COPY_PASTE ×2 · RETYPE · INSERT TYPE BADGE";
  if (kind === "recognition-type") return "PICK_SYMBOL · INSERT TYPE BADGE";
  if (kind === "recognition-avatar") return "DROP LOGO · COPY / PASTE · OFFSET";
  if (kind === "wire-to-real-comparison" || kind === "wireframe-panel") return "DRAW_BOX · DASH OUTLINES · DRAW_LINE RULERS + 24PX";
  if (kind === "wire-project-mock") return "DRAW_BOX · GRID · DASHED FRAMES · SPACING BARS";
  if (kind === "final-panel" || kind === "project-mock") return "SECOND AGENT · FILL / STYLE SAME BOXES INTO FINAL UI";
  if (kind === "comparison-handle" || kind === "comparison-slider") return "AGENT DRAGS HANDLE · DEMONSTRATE REVEAL";
  if (kind === "drag-hint") return "TYPE DRAG HINT · PREVIEW SLIDER";
  if (kind === "toolkit-chip") return "BUILD ONE CHIP · COPY_PASTE · RETYPE · OPEN_PICKER GLYPH";
  if (kind === "process-card" || kind === "process-step") return "DRAW_LINE · INSERT NODE SYMBOL · PULSE";
  if (kind === "process-node") return "PICK PROCESS GLYPH · PULSE NODE";
  if (kind === "about-quote") return "DRAW BOX · FILL · QUOTE MARK · TYPE";
  if (kind === "quote-mark") return "INSERT QUOTE SYMBOL";
  if (kind === "quote-signature") return "PEN TOOL · DRAW SIGNATURE STROKE";
  if (kind === "journey-timeline") return "DRAW_LINE · PICK NODE SYMBOL · SCROLL DRAW";
  if (kind === "journey-role") return index % 4 === 0 ? "BUILD TIMELINE ROW · TYPE + NOW NODE" : "COPY_PASTE · RETYPE ROLE ROW";
  if (kind === "milestone-row") return "COPY_PASTE MILESTONE · RETYPE · ADD HOVER PREVIEW";
  if (kind === "contact-row") return "OPEN_PICKER → PICK_SYMBOL + TYPE CONTACT ROW";
  if (kind === "project-form") return "DRAW_BOX · AUTO_LAYOUT GAP 24 · FORM COMPONENT";
  if (kind === "form-field") return "DRAW_BOX + TYPE PLACEHOLDER";
  if (kind === "form-select") return "DRAW_BOX + TYPE · INSERT CARET SYMBOL";
  if (kind === "form-submit") return "STYLE BUTTON · TYPE SEND PROJECT";
  if (kind === "footer-wordmark") return "TYPE + RESIZE FULL WIDTH · STYLE STROKE TO FILL";
  if (kind === "canvas") return "SET_TYPE KASIF · FIT WIDTH · CROP 20% · HALFTONE 3×3 → PRINT DOTS";
  if (kind === "footer-label") return "TYPE STUDIO LINE · TRACK +180";
  if (kind === "footer-meta") return "TYPE META · OPACITY 45%";
  if (kind === "footer-roles") return "TYPE ROLES · STACK · OPACITY 62%";
  if (kind === "footer-status") return "INSERT LIVE DOT · TYPE STATUS";
  if (kind === "footer-rule") return "DRAW_LINE HAIRLINE 0.5PX · FULL WIDTH";
  if (kind === "footer-top") return "TYPE BACK TO TOP · INSERT ARROW";
  if (kind === "footer-column-title") return "TYPE COLUMN HEADING · RESIZE";
  if (kind === "footer-link") return "COPY_PASTE LINK · RETYPE";
  if (kind === "footer-social") return "DRAW_BOX CIRCLE · OPEN_PICKER → PICK_SYMBOL";
  if (kind === "footer-replay") return "DRAW_BOX + TYPE + PLAY SYMBOL";
  if (kind === "footer-ist") return "DRAW_BOX + TYPE + CLOCK SYMBOL";
  if (section === "nav") return "STYLE NAV DETAIL";
  return `${frame.cue?.toUpperCase() ?? "BUILD"} / ${frame.layer.type.toUpperCase()}`;
}

export function BuildInspector({ frame }: { frame: BuildFrame }) {
  return (
    <aside className="agent-inspector" aria-hidden="true">
      <div className="agent-inspector-top">
        <span><i /> AGENT BUILD / LIVE</span>
        <b>{actLabels[frame.act ?? "build"]}</b>
      </div>
      <div className="agent-inspector-target">
        <small>ACTIVE SELECTION</small>
        <strong>{frame.layer.text.slice(0, 34) || frame.layer.type.toUpperCase()}</strong>
        <span>{recipeFor(frame)}</span>
      </div>
      <div className="agent-inspector-values">
        <span>W <b>{Math.round(frame.layer.rect.width)} px</b></span>
        <span>H <b>{Math.round(frame.layer.rect.height)} px</b></span>
        <span>OP <b>100%</b></span>
      </div>
      <div className="agent-inspector-layer">
        <span className="agent-inspector-layer-dot" />
        <span>{frame.layer.id.slice(0, 24)}</span>
        <span>●</span>
      </div>
      <div className="agent-inspector-chips"><span>◆ Component</span><span>--red-500</span><span>gap 24 · hug</span><span>contrast 7.2:1 ✓</span></div>
    </aside>
  );
}
