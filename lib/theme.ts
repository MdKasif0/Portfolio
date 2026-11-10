/**
 * Dark is the default. The choice is kept in localStorage and set on <html data-scheme> by an inline
 * script before first paint, so a light page never flashes dark.
 */
import { useSyncExternalStore } from "react";
import { inkReveal } from "@/lib/ink-transition";
import { COLORS, KEY, type Scheme } from "@/lib/theme-script";

export type { Scheme };

export function getScheme(): Scheme {
  return document.documentElement.dataset.scheme === "light" ? "light" : "dark";
}

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-scheme"] });
  return () => observer.disconnect();
}

export function useScheme(): Scheme {
  return useSyncExternalStore(subscribe, getScheme, () => "dark");
}

function applyScheme(scheme: Scheme) {
  const root = document.documentElement;
  if (scheme === "light") root.dataset.scheme = "light";
  else delete root.dataset.scheme;
  root.style.colorScheme = scheme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COLORS[scheme]);
  try { localStorage.setItem(KEY, scheme); } catch { /* private mode: the choice lasts for this page only */ }
}

/** The inline script can run before Next writes the theme-color meta tag, so the page sets it again once loaded. */
export function syncThemeColor() {
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COLORS[getScheme()]);
}

let switching = false;

/**
 * Switches the theme. With motion on, the new theme spreads from `origin` like ink in water.
 * Browsers without view transitions, reduced motion and Build Mode switch at once.
 */
export function setScheme(scheme: Scheme, origin?: { x: number; y: number }) {
  if (switching || scheme === getScheme()) return;
  const root = document.documentElement;
  const animated = typeof document.startViewTransition === "function"
    && root.dataset.motion === "ready"
    && !root.dataset.build
    && !root.dataset.vt
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!animated) { applyScheme(scheme); return; }

  switching = true;
  const point = origin ?? { x: window.innerWidth - 40, y: 38 };
  inkReveal(point, () => applyScheme(scheme)).finally(() => { switching = false; });
}
