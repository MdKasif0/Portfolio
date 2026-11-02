import type { BuildAction, BuildLayer, TaskDetails } from "@/components/agent-build/types";
import { ACTION_TOOLS, SYMBOL_GLYPHS } from "@/components/agent-build/actionLibrary";

export function ToolChrome({
  action,
  layer,
  details,
  progress = 0
}: {
  action: BuildAction;
  layer: BuildLayer;
  details?: TaskDetails;
  progress?: number;
}) {
  const isColor = action === "FILL" || action === "STYLE" || action === "RECOLOR";
  const isResize = action === "RESIZE_TEXT";
  const isPicker = action === "OPEN_PICKER" || action === "PICK_SYMBOL";
  const isCrop = action === "CROP";
  const isCopyPaste = action === "COPY_PASTE";
  const isImage = action === "DROP_IMAGE" || action === "SWAP_IMAGE";

  const hexValue = details?.hex || (action === "FILL" ? layer.textStyle.backgroundColor : layer.textStyle.color);
  const toolKey = details?.toolShortcut || ACTION_TOOLS[action] || "V";

  return (
    <div className="agent-tool-chrome-wrap" aria-hidden="true">
      {/* Primary Tool Badge */}
      <span className="agent-tool-chrome">
        <i>{toolKey}</i>
        <span>{details?.verb || action.replaceAll("_", " ").toLowerCase()}</span>
      </span>

      {/* Color popover with hex & eyedropper */}
      {isColor && hexValue && (
        <span className="agent-color-popover">
          <span className="agent-color-swatch" style={{ backgroundColor: hexValue }} />
          <b>{hexValue}</b>
          <svg className="agent-eyedropper-icon" viewBox="0 0 16 16" fill="none">
            <path d="M11.5 2.5a1.4 1.4 0 0 1 2 2l-1 1-2-2 1-1Z" stroke="currentColor" strokeWidth="1.2" />
            <path d="m10.5 3.5-7 7L3 13l2.5-.5 7-7-2-2Z" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </span>
      )}

      {/* Font resize chip ("Anton 48 -> 96 -> 160") */}
      {isResize && details?.finalFontSize && (
        <span className="agent-font-size-chip">
          {details.fontFamily || "Inter"}{" "}
          {Math.round(details.initialFontSize! + (details.finalFontSize - details.initialFontSize!) * progress)}px
        </span>
      )}

      {/* Radius chip ("radius 16") */}
      {action === "ROUND_CORNERS" && (
        <span className="agent-radius-chip">
          radius {details?.radius || Number.parseInt(layer.textStyle.borderRadius) || 16}
        </span>
      )}

      {/* Gap chip ("gap 24") */}
      {isCopyPaste && (
        <span className="agent-gap-chip">
          gap {details?.gap || 24}px
        </span>
      )}

      {/* Symbol picker popover (4x3 grid) */}
      {isPicker && (
        <div className="agent-symbol-picker-popover">
          <div className="agent-symbol-grid">
            {SYMBOL_GLYPHS.map((glyph, idx) => (
              <span
                key={glyph}
                className={`agent-symbol-cell ${idx === (details?.symbolGlyph ? SYMBOL_GLYPHS.indexOf(details.symbolGlyph) : 0) ? "is-selected" : ""}`}
              >
                {glyph}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Asset tray preview for images */}
      {(isImage || isCrop) && layer.imageSrc && (
        <div className="agent-asset-tray-chip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={layer.imageSrc} alt="" className="agent-asset-tray-thumb" />
          <span>asset ready</span>
        </div>
      )}
    </div>
  );
}
