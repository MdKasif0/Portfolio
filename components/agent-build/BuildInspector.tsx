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
    </aside>
  );
}
