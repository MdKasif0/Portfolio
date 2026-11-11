/**
 * After the build film: the page is back at the top, the theme button lights up, and the theme inks
 * over to the other one and back, so a first-time visitor sees the switch and where it lives.
 * The saved theme choice is never touched. Any scroll, click or key press ends it early; if the
 * page is in the other theme by then, it inks back.
 */
import { getScheme, isSwitching, setScheme } from "@/lib/theme";

const sleep = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) { reject(new Error("aborted")); return; }
  const timer = window.setTimeout(resolve, ms);
  signal.addEventListener("abort", () => { window.clearTimeout(timer); reject(new Error("aborted")); }, { once: true });
});

const centreOf = (element: HTMLElement) => {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};

export async function showcaseTheme(outer: AbortSignal) {
  const button = document.querySelector<HTMLElement>(".theme-toggle");
  if (!button || !button.getBoundingClientRect().width) return;

  const controller = new AbortController();
  const stop = () => controller.abort();
  outer.addEventListener("abort", stop, { once: true });
  // A click on the theme button itself is the visitor taking over the switch: theirs stands.
  let byButton = false;
  const visitor = (event: Event) => {
    if (!event.isTrusted) return;
    if (event.target instanceof Element && event.target.closest(".theme-toggle")) byButton = true;
    stop();
  };
  const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
  events.forEach((name) => window.addEventListener(name, visitor, { passive: true }));
  const { signal } = controller;

  const original = getScheme();
  const other = original === "dark" ? "light" : "dark";
  const root = document.documentElement;
  try {
    // The film glides back to the top as it hands over; start once it has landed.
    const until = performance.now() + 2600;
    while (window.scrollY > 4 && performance.now() < until) await sleep(100, signal);
    if (window.scrollY > 4) return;
    root.dataset.themeShowcase = original === "dark" ? "to-light" : "to-dark";
    await sleep(1100, signal);
    await setScheme(other, centreOf(button), { persist: false });
    root.dataset.themeShowcase = original === "dark" ? "to-dark" : "to-light";
    await sleep(1300, signal);
    await setScheme(original, centreOf(button), { persist: false });
    await sleep(900, signal);
  } catch {
    // Stopped early. A switch already under way finishes first; then the page goes back if needed.
    while (isSwitching()) await new Promise((resolve) => window.setTimeout(resolve, 60));
    if (byButton) return;
    if (getScheme() !== original && !outer.aborted) await setScheme(original, centreOf(button), { persist: false });
    else if (getScheme() !== original) await setScheme(original, undefined, { persist: false });
  } finally {
    events.forEach((name) => window.removeEventListener(name, visitor));
    outer.removeEventListener("abort", stop);
    delete root.dataset.themeShowcase;
  }
}
