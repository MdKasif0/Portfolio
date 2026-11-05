/**
 * The morph from a Work card (or the next-case-study band) into a case study's header. Browsers without
 * view transitions, reduced motion and Build Mode all get a normal navigation instead.
 */

let settle: (() => void) | null = null;

/** MotionShell calls this when the new route has committed. */
export function routeCommitted() {
  settle?.();
  settle = null;
}

export function canMorph() {
  const root = document.documentElement;
  return typeof document.startViewTransition === "function" && root.dataset.motion === "ready" && !root.dataset.build;
}

const wait = (ms: number) => new Promise<void>((resolve) => { window.setTimeout(resolve, ms); });

export function morphTo(link: HTMLElement, navigate: () => void) {
  const root = document.documentElement;
  const named: HTMLElement[] = [];
  const name = (element: HTMLElement | null, value: string) => {
    if (!element) return;
    element.style.setProperty("view-transition-name", value);
    named.push(element);
  };
  // A clip that's already playing is what the eye is on, so that's the frame that grows.
  name(link.querySelector<HTMLElement>(".project-clip.is-playing") ?? link.querySelector<HTMLElement>("[data-vt-art]"), "cs-art");
  name(link.querySelector<HTMLElement>("[data-vt-title]"), "cs-title");
  root.dataset.vt = "leaving";

  const transition = document.startViewTransition(async () => {
    await Promise.race([new Promise<void>((resolve) => { settle = resolve; navigate(); }), wait(2500)]);
    settle = null;
    named.forEach((element) => element.style.removeProperty("view-transition-name"));
    root.dataset.vt = "arriving";
    // The header image has to be painted before the new state is captured.
    const art = document.querySelector<HTMLImageElement>(".cs-hero-art img");
    if (art) await Promise.race([art.decode().catch(() => undefined), wait(450)]);
  });
  // The browser can abandon the animation (a phone's viewport resizing, say). The navigation still happens.
  transition.ready.catch(() => undefined);
  transition.finished.finally(() => { delete root.dataset.vt; }).catch(() => undefined);
}
