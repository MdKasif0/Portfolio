"use client";

import { useEffect, useId, useState } from "react";
import { setScheme, syncThemeColor, useScheme } from "@/lib/theme";
import { prepareInk } from "@/lib/ink-transition";

const centre = (element: HTMLElement) => {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};

/** A moon in the dark theme, a sun in the light one. The new theme spreads out from this button. */
export function ThemeToggle() {
  const scheme = useScheme();
  // The server renders the dark theme, so the icon waits for the real value before it shows a sun.
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); syncThemeColor(); }, []);
  const light = ready && scheme === "light";
  const cut = `theme-cut-${useId().replace(/:/g, "")}`;

  return (
    <button
      className={`theme-toggle${light ? " is-light" : ""}`}
      data-magnetic
      data-magnetic-variant="outline"
      data-layer="button"
      data-kind="theme-switch"
      type="button"
      aria-label={light ? "Switch to the dark theme" : "Switch to the light theme"}
      onPointerEnter={(event) => prepareInk(centre(event.currentTarget))}
      onFocus={(event) => prepareInk(centre(event.currentTarget))}
      onClick={(event) => setScheme(light ? "dark" : "light", centre(event.currentTarget))}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <mask id={cut}>
          <rect width="24" height="24" fill="#fff" />
          <circle className="theme-toggle-bite" cx="17" cy="7" r="6.4" fill="#000" />
        </mask>
        <circle className="theme-toggle-core" cx="12" cy="12" r="7" mask={`url(#${cut})`} />
        <g className="theme-toggle-rays">
          {Array.from({ length: 8 }, (_, index) => (
            <line key={index} x1="12" y1="1.6" x2="12" y2="3.6" transform={`rotate(${index * 45} 12 12)`} />
          ))}
        </g>
      </svg>
    </button>
  );
}
