"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { portfolioContent } from "@/data/content";
import { useMotionPreference } from "@/components/motion-shell";

export function SiteNav() {
  const { motionEnabled, setMotionEnabled } = useMotionPreference();
  const [progress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [compressed, setCompressed] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = (event: MediaQueryListEvent) => setMotionEnabled(!event.matches);
    preference.addEventListener("change", updatePreference);

    const updateProgress = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(maxScroll > 0 ? window.scrollY / maxScroll : 0);
      setCompressed(window.scrollY > 80);
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    const sections = portfolioContent.navigation
      .map((item) => document.querySelector<HTMLElement>(item.href))
      .filter((section): section is HTMLElement => section !== null);
    const observer = new IntersectionObserver((entries) => {
      const current = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
      if (!current) {
        if (window.scrollY <= window.innerHeight * 0.55) {
          setActiveSection("work");
          if (window.location.hash !== "#work") window.history.replaceState(window.history.state, "", "#work");
        }
        return;
      }
      const id = (current.target as HTMLElement).id;
      setActiveSection(id);
      const hash = `#${id}`;
      if (window.location.hash !== hash) window.history.replaceState(window.history.state, "", hash);
    }, { threshold: 0, rootMargin: "-42% 0px -48% 0px" });
    sections.forEach((section) => observer.observe(section));
    return () => {
      preference.removeEventListener("change", updatePreference);
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
      observer.disconnect();
    };
  }, [setMotionEnabled]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    // Rotating a phone can remove the menu button; without this the page would stay scroll-locked.
    const menuBreakpoint = window.matchMedia("(max-width: 640px)");
    const closeOnLayoutChange = () => { if (!menuBreakpoint.matches) setMenuOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    menuBreakpoint.addEventListener("change", closeOnLayoutChange);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      menuBreakpoint.removeEventListener("change", closeOnLayoutChange);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <div className="scroll-progress" data-build-section="nav" data-layer="line" data-kind="progress" aria-hidden="true">
        <span data-layer="line" data-kind="progress-value" style={{ transform: `scaleY(${progress})` }} />
      </div>
      <header className={`site-nav${compressed ? " is-compressed" : ""}`} data-scene="nav" data-layer="card" data-kind="nav-frame">
        <div className="nav-inner container-x">
          <a className="nav-logo" data-magnetic data-layer="text" data-kind="logo" href="#top" aria-label="Kasif, home">
            <Image className="nav-logo-mark" src="/logo-mark.png" alt="" width={128} height={128} priority />
            <span>KASIF<span className="logo-dot">.</span></span>
          </a>
          <nav id="primary-navigation" className={`nav-links${menuOpen ? " is-open" : ""}`} aria-label="Main navigation" data-lenis-prevent>
            {portfolioContent.navigation.map((item) => (
              <a className={activeSection === item.href.slice(1) ? "is-active" : ""} data-magnetic data-layer="text" data-kind="nav-link" href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>
                {item.label}{activeSection === item.href.slice(1) && <motion.i className="nav-active-underline" layoutId="nav-active-underline" />}
              </a>
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
              data-magnetic
              data-layer="button"
              data-kind="motion-switch"
              type="button"
              aria-label={motionEnabled ? "Turn motion off" : "Turn motion on"}
              aria-pressed={motionEnabled}
              onClick={() => setMotionEnabled(!motionEnabled)}
            >
              <span className={`motion-switch-track${motionEnabled ? " is-on" : ""}`} aria-hidden="true"><i /></span>
              <span className="motion-toggle-label">Motion {motionEnabled ? "on" : "off"}</span>
            </button>
            <a className="talk-link" data-magnetic data-layer="button" data-kind="nav-cta" href={portfolioContent.navigationCta.href}>{portfolioContent.navigationCta.label} <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <div className="nav-scroll-progress" aria-hidden="true"><i style={{ transform: `scaleX(${progress})` }} /></div>
      </header>
    </>
  );
}
