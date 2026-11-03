"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Lenis from "lenis";
import { BuildProvider } from "@/components/agent-build/BuildProvider";
import { portfolioContent } from "@/data/content";

const MotionPreferenceContext = createContext<{
  motionEnabled: boolean;
  setMotionEnabled: (enabled: boolean) => void;
} | null>(null);

export function useMotionPreference() {
  const context = useContext(MotionPreferenceContext);
  if (!context) throw new Error("useMotionPreference must be used within MotionShell");
  return context;
}

export function MotionShell({ children }: { children: ReactNode }) {
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMotionEnabled(!preference.matches);
    document.documentElement.dataset.motion = preference.matches ? "off" : "ready";
    if (process.env.NODE_ENV === "development") {
      const missing: string[] = [];
      const visit = (value: unknown, path: string) => {
        if (value === undefined || value === null || value === "") {
          missing.push(path);
          return;
        }
        if (Array.isArray(value)) {
          value.forEach((item, index) => visit(item, `${path}[${index}]`));
        } else if (typeof value === "object") {
          Object.entries(value).forEach(([key, item]) => visit(item, `${path}.${key}`));
        }
      };
      visit(portfolioContent, "portfolioContent");
      if (missing.length) console.table(missing.map((field) => ({ missingField: field })));
    }

    const updatePreference = (event: MediaQueryListEvent) => {
      document.documentElement.dataset.motion = event.matches ? "off" : "ready";
      setMotionEnabled(!event.matches);
    };
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!motionEnabled) return;

    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    setLenisInstance(lenis);
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = window.requestAnimationFrame(raf);
    };

    frame = window.requestAnimationFrame(raf);
    return () => {
      window.cancelAnimationFrame(frame);
      setLenisInstance(null);
      lenis.destroy();
    };
  }, [motionEnabled]);

  const scrollTo = (target: number, duration: number) => {
    if (lenisInstance) {
      lenisInstance.scrollTo(target, {
        duration,
        immediate: duration === 0,
        easing: (value) => value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2
      });
    } else {
      window.scrollTo({ top: target, behavior: duration === 0 ? "auto" : "smooth" });
    }
  };
  const cancelScroll = () => {
    if (lenisInstance) {
      lenisInstance.scrollTo(window.scrollY, { immediate: true, force: true });
    } else {
      window.scrollTo({ top: window.scrollY, behavior: "auto" });
    }
  };

  return (
    <MotionPreferenceContext.Provider value={{ motionEnabled, setMotionEnabled }}>
      <div className={motionEnabled ? "motion-enabled" : "motion-disabled"} data-motion={motionEnabled ? "on" : "off"}>
        <MotionPolish />
        <BuildProvider motionEnabled={motionEnabled} scrollTo={scrollTo} cancelScroll={cancelScroll}>{children}</BuildProvider>
      </div>
    </MotionPreferenceContext.Provider>
  );
}

function MotionPolish() {
  const { motionEnabled } = useMotionPreference();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = motionEnabled && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "ready" : "off";
    const targets = Array.from(document.querySelectorAll<HTMLElement>(".display-title:not(.hero-name)"));
    if (root.dataset.motion !== "ready") {
      targets.forEach((target) => target.classList.add("motion-reveal-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("motion-reveal-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: "0px 0px -2.5% 0px" });

    targets.forEach((target) => observer.observe(target));
    const safety = window.setTimeout(() => {
      targets.forEach((target) => target.classList.add("motion-reveal-visible"));
      observer.disconnect();
    }, 2500);

    return () => {
      window.clearTimeout(safety);
      observer.disconnect();
    };
  }, [motionEnabled]);

  return null;
}
