"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ReelPlayer } from "@/components/reel-player";

const EXIT_MS = 220;

export function ShowreelModal({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLElement>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout>>();
  const [closing, setClosing] = useState(false);
  // The parent re-renders often while Build Mode runs, so its callback must not re-run the setup effect below.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const close = useCallback((after?: () => void) => {
    setClosing(true);
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => {
      onCloseRef.current();
      after?.();
    }, instant ? 0 : EXIT_MS);
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.dispatchEvent(new CustomEvent("kasif:reel", { detail: { open: true } }));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Escape belongs to the reel while it is open, so it must not also skip Build Mode behind it.
        event.stopPropagation();
        // The player uses Escape to close its menu first; the browser uses it to leave fullscreen.
        if (!event.defaultPrevented && !document.fullscreenElement) close();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(dialog.current?.querySelectorAll<HTMLElement>("button, a[href], input, [tabindex='0']") ?? []);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !focusable.includes(active as HTMLElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.dispatchEvent(new CustomEvent("kasif:reel", { detail: { open: false } }));
      clearTimeout(exitTimer.current);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [close]);

  const goToContact = useCallback(() => {
    close(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [close]);

  return createPortal(
    <div
      className={`reel-backdrop${closing ? " is-closing" : ""}`}
      data-lenis-prevent
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section ref={dialog} className="reel-dialog" role="dialog" aria-modal="true" aria-labelledby="reel-title">
        <ReelPlayer onContact={goToContact} onClose={() => close()} />
      </section>
    </div>,
    document.body
  );
}
