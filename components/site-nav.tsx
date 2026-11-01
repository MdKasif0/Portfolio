"use client";

import { useEffect, useState } from "react";
import { portfolioContent } from "@/data/content";
import { useMotionPreference } from "@/components/motion-shell";

function MotionIcon({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7-4.5-7-4.5Z" /></svg>
  ) : (
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5 11.5 11.5M11.5 4.5l-7 7" /></svg>
  );
}

export function SiteNav() {
  const { motionEnabled, setMotionEnabled } = useMotionPreference();
  const [progress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = (event: MediaQueryListEvent) => setMotionEnabled(!event.matches);
    preference.addEventListener("change", updatePreference);

    const updateProgress = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(maxScroll > 0 ? window.scrollY / maxScroll : 0);
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      preference.removeEventListener("change", updatePreference);
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [setMotionEnabled]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <div className="scroll-progress" data-build-section="nav" aria-hidden="true">
        <span data-layer="line" style={{ transform: `scaleY(${progress})` }} />
      </div>
      <header className="site-nav" data-scene="nav">
        <div className="nav-inner">
          <a className="nav-logo" data-layer="text" href="#top" aria-label="Kasif, home">
            KASIF<span className="logo-dot">.</span>
          </a>
          <nav id="primary-navigation" className={`nav-links${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
            {portfolioContent.navigation.map((item) => (
              <a data-layer="text" href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>
            ))}
          </nav>
          <div className="nav-actions">
            <button
              className={`menu-toggle${menuOpen ? " is-open" : ""}`}
              data-layer="button"
              type="button"
              aria-controls="primary-navigation"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span /><span />
            </button>
            <button
              className="motion-toggle"
              data-layer="button"
              type="button"
              aria-pressed={motionEnabled}
              onClick={() => setMotionEnabled(!motionEnabled)}
            >
              <MotionIcon enabled={motionEnabled} />
              <span>Motion {motionEnabled ? "on" : "off"}</span>
            </button>
            <a className="talk-link" data-layer="button" href={portfolioContent.navigationCta.href}>{portfolioContent.navigationCta.label} <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </header>
    </>
  );
}
