import type { BuildAction } from "@/components/agent-build/types";
import type { BuildLayer } from "@/components/agent-build/types";

const toolForAction: Record<BuildAction, string> = {
  DRAW_BOX: "R", FILL: "Fill", ROUND_CORNERS: "Radius", DRAW_TEXTBOX: "T",
  TYPE: "Type", RESIZE_TEXT: "Size", STYLE: "Style", DROP_IMAGE: "I",
  CROP: "Crop", OPEN_PICKER: "/", PICK_SYMBOL: "Symbols", DROP: "Drop",
  SCALE: "Scale", RECOLOR: "Color", ADD_SYMBOL: "↗", DRAW_LINE: "Line",
  COPY_PASTE: "⌘V", RETYPE: "Retype", SWAP_IMAGE: "Swap"
};

export function ToolChrome({ action, layer }: { action: BuildAction; layer: BuildLayer }) {
  const detail = action === "FILL" ? layer.textStyle.backgroundColor
    : action === "STYLE" || action === "RECOLOR" ? layer.textStyle.color
    : action === "ROUND_CORNERS" ? layer.textStyle.borderRadius
    : action === "RESIZE_TEXT" ? `${layer.textStyle.fontFamily} ${layer.textStyle.fontSize}`
    : "";
  return (
    <span className="agent-tool-chrome" aria-hidden="true">
      <i>{toolForAction[action]}</i>
      <span>{action.replaceAll("_", " ").toLowerCase()}…</span>
      {detail && <b>{detail}</b>}
    </span>
  );
}
