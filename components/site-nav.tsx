"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { portfolioContent } from "@/data/content";
import { useMotionPreference } from "@/components/motion-shell";

export function SiteNav() {
  const { motionEnabled, setMotionEnabled } = useMotionPreference();
  const [progress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("#work");
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = (event: MediaQueryListEvent) => setMotionEnabled(!event.matches);
    preference.addEventListener("change", updatePreference);

    let frame = 0;
    const updateScrollState = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(maxScroll > 0 ? window.scrollY / maxScroll : 0);
      setCompact(window.scrollY > 80);

      const threshold = window.innerHeight * 0.42;
      let href = portfolioContent.navigation[0]?.href;
      for (const item of portfolioContent.navigation) {
        const section = document.getElementById(item.href.slice(1));
        if (section && section.getBoundingClientRect().top <= threshold) href = item.href;
      }
      if (!href) return;
      setActiveHref(href);
      if (window.location.hash !== href || window.location.search) {
        window.history.replaceState(null, "", `${window.location.pathname}${href}`);
      }
    };
    const scheduleScrollState = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateScrollState();
      });
    };
    const observedSections = portfolioContent.navigation
      .map((item) => document.getElementById(item.href.slice(1)))
      .filter((section): section is HTMLElement => section !== null);
    const spyLine = Math.round(window.innerHeight * 0.42);
    const observer = new IntersectionObserver(scheduleScrollState, {
      rootMargin: `-${spyLine}px 0px -${Math.max(0, window.innerHeight - spyLine - 1)}px 0px`
    });
    observedSections.forEach((section) => observer.observe(section));
    updateScrollState();
    window.addEventListener("scroll", scheduleScrollState, { passive: true });
    window.addEventListener("resize", scheduleScrollState);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      preference.removeEventListener("change", updatePreference);
      window.removeEventListener("scroll", scheduleScrollState);
      window.removeEventListener("resize", scheduleScrollState);
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
        <span data-layer="line" data-kind="scroll-progress" style={{ transform: `scaleY(${progress})` }} />
      </div>
      <header className={`site-nav glass container-x${compact ? " is-compact" : ""}`} data-scene="nav" data-layer="card" data-kind="nav-frame">
        <div className="nav-inner container-x" data-kind="nav-content">
          <a className="nav-logo" data-layer="text" data-kind="logo" href="#top" aria-label="Kasif, home">
            KASIF<span className="logo-dot">.</span>
          </a>
          <nav id="primary-navigation" className={`nav-links${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
            {portfolioContent.navigation.map((item) => (
              <a
                data-layer="text"
                data-kind="nav-link"
                href={item.href}
                key={item.href}
                aria-current={activeHref === item.href ? "location" : undefined}
                onClick={() => {
                  setMenuOpen(false);
                  setActiveHref(item.href);
                }}
              >
                {item.label}
                {activeHref === item.href && <motion.span className="nav-active-indicator" layoutId="nav-active-indicator" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              </a>
            ))}
          </nav>
          <div className="nav-actions">
            <button
              className={`menu-toggle${menuOpen ? " is-open" : ""}`}
              data-layer="button"
              data-kind="menu-toggle"
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
              data-kind="motion-switch"
              type="button"
              aria-pressed={motionEnabled}
              aria-label={`Motion ${motionEnabled ? "on" : "off"}`}
              onClick={() => setMotionEnabled(!motionEnabled)}
            >
              <span className="motion-switch" aria-hidden="true"><i /></span>
              <span>Motion {motionEnabled ? "on" : "off"}</span>
            </button>
            <a className="talk-link" data-layer="button" data-kind="cta" href={portfolioContent.navigationCta.href}>{portfolioContent.navigationCta.label} <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <div className="nav-progress" data-layer="line" data-kind="nav-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>
      </header>
    </>
  );
}
