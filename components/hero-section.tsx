"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform
} from "framer-motion";
import Image from "next/image";
import { portfolioContent } from "@/data/content";
import { useAgentBuild } from "@/components/agent-build/BuildProvider";
import { useMotionPreference } from "@/components/motion-shell";
import { ShowreelModal } from "@/components/showreel-modal";

const hero = portfolioContent.hero;
const providedHeroStats: Array<{ value: string; label: string }> = hero.stats.flatMap((stat) =>
  stat.value ? [{ value: stat.value, label: stat.label }] : []
);
// Your own stats lead; the project count only fills in when fewer than three are provided.
const heroStats = providedHeroStats.length >= 3
  ? providedHeroStats
  : [...providedHeroStats, { value: String(portfolioContent.work.projects.length), label: "PROJECTS" }];
const marqueeCopy = "AI ENGINEERING · BACKEND SYSTEMS · AI PRODUCTS · TECH CONTENT · SHIPPED FAST";
const hudTicks = Array.from({ length: 48 }, (_, index) => index);
const heroChips = ["LLM Apps", "Node.js APIs", "Data Models", "AI"];

function AnimatedStat({
  value,
  label,
  active,
  motionEnabled
}: {
  value: string;
  label: string;
  active: boolean;
  motionEnabled: boolean;
}) {
  // "3+" counts up to 3 and keeps the "+"; symbols like "∞" are shown as they are.
  const match = /^(\d+)(.*)$/.exec(value);
  const numericValue = match ? Number(match[1]) : Number.NaN;
  const suffix = match ? match[2] : "";
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active || !Number.isFinite(numericValue)) return;
    if (document.visibilityState !== "visible") {
      setCount(numericValue);
      return;
    }

    const start = performance.now();
    let frame = 0;
    const update = (now: number) => {
      const progress = Math.min((now - start) / 1100, 1);
      setCount(Math.round(numericValue * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = window.requestAnimationFrame(update);
    };

    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [active, numericValue]);

  return (
    <div className="hero-stat" data-layer="card" data-kind="stat-card" role="listitem">
      <span className="hero-stat-value" data-layer="text" data-kind="stat-number">
        {Number.isFinite(numericValue) ? (
          <>
            {motionEnabled && active ? count : numericValue}
            {/* Plain numbers end with the red period; "3+" carries the red accent on its "+" instead. */}
            <span className="stat-period">{suffix || "."}</span>
          </>
        ) : (
          <span className="stat-symbol">{value}</span>
        )}
      </span>
      <span className="hero-stat-label" data-layer="text" data-kind="stat-label">{label}</span>
    </div>
  );
}

function HeroHud() {
  return (
    <div className="hero-v2-hud" aria-hidden="true">
      <svg className="hero-hud-rings" viewBox="0 0 480 480" fill="none">
        <g className="hero-hud-ring hero-hud-ring-outer" data-layer="icon" data-kind="hud-ring">
          <circle cx="240" cy="240" r="228" />
          {hudTicks.map((tick) => (
            <path
              key={tick}
              d={`M240 4v${tick % 4 === 0 ? 14 : 7}`}
              transform={`rotate(${tick * 7.5} 240 240)`}
              data-layer="line"
              data-kind="hud-tick"
            />
          ))}
        </g>
        <g className="hero-hud-ring hero-hud-ring-inner" data-layer="icon" data-kind="hud-ring">
          <circle cx="240" cy="240" r="194" />
          <circle cx="240" cy="240" r="184" strokeDasharray="1 9" />
        </g>
      </svg>
      <span className="hero-hud-corner hero-hud-corner-tl" data-layer="line" data-kind="crop-mark" />
      <span className="hero-hud-corner hero-hud-corner-tr" data-layer="line" data-kind="crop-mark" />
      <span className="hero-hud-corner hero-hud-corner-bl" data-layer="line" data-kind="crop-mark" />
      <span className="hero-hud-corner hero-hud-corner-br" data-layer="line" data-kind="crop-mark" />
      <span className="hero-hud-label hero-hud-label-top" data-layer="text" data-kind="hud-label">FRAME 001</span>
      <span className="hero-hud-label hero-hud-label-bottom" data-layer="text" data-kind="hud-label">1920 × 1080</span>
    </div>
  );
}

export function HeroSection({ cvAvailable = false }: { cvAvailable?: boolean }) {
  const { motionEnabled } = useMotionPreference();
  const { phase } = useAgentBuild();
  const [reelOpen, setReelOpen] = useState(false);
  const [cutoutLoaded, setCutoutLoaded] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const pointerFrameRef = useRef(0);
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 72, damping: 22, mass: 0.7 });
  const springY = useSpring(pointerY, { stiffness: 72, damping: 22, mass: 0.7 });
  const wordX = useTransform(springX, [-1, 1], [-14, 14]);
  const wordY = useTransform(springY, [-1, 1], [-8, 8]);
  const avatarX = useTransform(springX, [-1, 1], [10, -10]);
  const avatarY = useTransform(springY, [-1, 1], [7, -7]);
  const avatarRotate = useTransform(springX, [-1, 1], [-2.5, 2.5]);
  const chipsX = useTransform(springX, [-1, 1], [-19, 19]);
  const chipsY = useTransform(springY, [-1, 1], [16, -16]);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const wordScrollY = useTransform(scrollYProgress, [0, 1], [0, 34]);
  const statsActive = useInView(statsRef, { once: true, amount: 0.2 });
  const entranceReady = phase === "done" || phase === "skipped";

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!motionEnabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches || event.pointerType !== "mouse") return;
    pendingPointerRef.current = { x: event.clientX, y: event.clientY };
    if (pointerFrameRef.current) return;

    pointerFrameRef.current = window.requestAnimationFrame(() => {
      pointerFrameRef.current = 0;
      const point = pendingPointerRef.current;
      const section = sectionRef.current;
      if (!point || !section) return;
      const bounds = section.getBoundingClientRect();
      const normalizedX = (point.x - bounds.left) / bounds.width * 2 - 1;
      const normalizedY = (point.y - bounds.top) / bounds.height * 2 - 1;
      pointerX.set(Math.max(-1, Math.min(1, normalizedX)));
      pointerY.set(Math.max(-1, Math.min(1, normalizedY)));
      section.style.setProperty("--spot-x", `${point.x - bounds.left}px`);
      section.style.setProperty("--spot-y", `${point.y - bounds.top}px`);

      const name = section.querySelector<HTMLElement>(".hero-v2-name");
      const letters = name?.querySelectorAll<HTMLElement>(".hero-letter");
      if (!name || !letters) return;
      const nameBounds = name.getBoundingClientRect();
      letters.forEach((letter, index) => {
        const center = nameBounds.left + ((index + 0.5) / letters.length) * nameBounds.width;
        const distance = Math.abs(point.x - center);
        const influence = Math.max(0, 1 - distance / 130);
        letter.style.setProperty("--letter-lift", `${-Math.sin(influence * Math.PI / 2) * 7}px`);
        letter.style.setProperty("--letter-tilt", `${(normalizedY * influence * (index % 2 ? -1 : 1) * 2.2).toFixed(2)}deg`);
      });
    });
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
    pendingPointerRef.current = null;
    if (pointerFrameRef.current) {
      window.cancelAnimationFrame(pointerFrameRef.current);
      pointerFrameRef.current = 0;
    }
    const section = sectionRef.current;
    section?.style.removeProperty("--spot-x");
    section?.style.removeProperty("--spot-y");
    section?.querySelectorAll<HTMLElement>(".hero-letter").forEach((letter) => {
      letter.style.setProperty("--letter-lift", "0px");
      letter.style.setProperty("--letter-tilt", "0deg");
    });
  };

  useEffect(() => () => {
    if (pointerFrameRef.current) window.cancelAnimationFrame(pointerFrameRef.current);
  }, []);

  return (
    <>
      <section
        className={`hero hero-stage hero-v2${entranceReady && motionEnabled ? " hero-v2-animate" : ""}`}
        id="top"
        data-scene="hero"
        ref={sectionRef}
        aria-labelledby="hero-title"
        onPointerMove={handlePointerMove}
        onPointerLeave={resetPointer}
      >
        <div className="hero-v2-container container-x">
          <div className="hero-v2-topline">
            <div className="hero-v2-eyebrow" data-layer="text" data-kind="eyebrow">
              <span className="hero-eyebrow-rule" data-layer="line" data-kind="eyebrow-rule" />
              <span>{hero.eyebrow[0]}</span>
            </div>
            <div className="hero-v2-availability" data-layer="card" data-kind="availability">
              <span data-layer="icon" data-kind="availability-dot" aria-hidden="true" />
              {hero.availability} · {hero.nextAvailability}
            </div>
          </div>

          <motion.div className="hero-v2-word-scroll" style={{ y: wordScrollY }} aria-hidden="true">
            <motion.div className="hero-v2-word-depth" style={{ x: wordX, y: wordY }}>
              <div className="hero-v2-word-back" data-layer="text" data-kind="portfolio-word-fill">
                <svg viewBox="0 0 1600 440" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="hero-word-gradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#F2503E" />
                      <stop offset="44%" stopColor="#D93025" />
                      <stop offset="78%" stopColor="#651821" stopOpacity=".76" />
                      <stop offset="100%" stopColor="#05050A" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <text x="800" y="275" textAnchor="middle" textLength="1510" lengthAdjust="spacingAndGlyphs" fill="url(#hero-word-gradient)">
                    {hero.backgroundWord}
                  </text>
                </svg>
              </div>
              <span className="hero-v2-word-sweep" data-layer="line" data-kind="light-sweep" />
            </motion.div>
          </motion.div>

          <motion.div className="hero-v2-word-outline-scroll" style={{ y: wordScrollY }} aria-hidden="true">
            <motion.div className="hero-v2-word-depth" style={{ x: wordX, y: wordY }}>
              <div className="hero-v2-word-stroke" data-layer="text" data-kind="portfolio-word-outline">
                <svg viewBox="0 0 1600 440" preserveAspectRatio="none">
                  <text x="800" y="275" textAnchor="middle" textLength="1510" lengthAdjust="spacingAndGlyphs">
                    {hero.backgroundWord}
                  </text>
                </svg>
              </div>
            </motion.div>
          </motion.div>

          <HeroHud />

          <div className="hero-v2-avatar-scroll">
            <motion.div className={`hero-v2-avatar${cutoutLoaded ? " is-loaded" : ""}`} data-layer="image" data-kind="avatar" style={{ x: avatarX, y: avatarY, rotate: avatarRotate }}>
              <span className="hero-avatar-ground" aria-hidden="true" />
              <span className="hero-avatar-rim" aria-hidden="true" />
              <picture>
                <source media="(max-width: 700px)" srcSet={hero.cutoutMobilePath} type="image/webp" />
                <Image
                  src={hero.cutoutPath}
                  alt={hero.cutoutAlt}
                  width={1254}
                  height={1254}
                  priority
                  onLoad={() => setCutoutLoaded(true)}
                  onError={(event) => {
                    setCutoutLoaded(false);
                    event.currentTarget.classList.add("portrait-missing");
                  }}
                />
              </picture>
              {!cutoutLoaded && <span className="hero-avatar-placeholder">{hero.cutoutPlaceholder}</span>}
            </motion.div>
          </div>

          <div className="hero-v2-chips-anchor">
            <motion.div className="hero-v2-chips" data-layer="icon" data-kind="glass-chip-cluster" style={{ x: chipsX, y: chipsY }} aria-hidden="true">
              {heroChips.map((chip, index) => (
                <span className={`hero-v2-chip hero-v2-chip-${index + 1}`} data-layer="card" data-kind="glass-chip" key={chip}>
                  <i aria-hidden="true" />
                  {chip}
                </span>
              ))}
            </motion.div>
          </div>

          <div className="hero-v2-copy">
            <p className="hero-v2-script" data-layer="text" data-kind="handwritten">
              <span>{hero.greeting}</span>
              <svg viewBox="0 0 220 36" aria-hidden="true">
                <path d="M5 27c46-21 92-17 137-9 24 4 48 7 73 0" data-layer="line" data-kind="pen-stroke" />
              </svg>
            </p>
            <h1 id="hero-title" className="hero-v2-name" data-layer="text" data-kind="display-name">
              <span className="sr-only">{portfolioContent.identity.displayName}.</span>
              {portfolioContent.identity.displayName.split("").map((letter, index) => (
                <span className="hero-letter" data-layer="text" data-kind="name-letter" aria-hidden="true" key={`${letter}-${index}`}>{letter}</span>
              ))}
              <span className="hero-name-period" data-layer="text" data-kind="name-period" aria-hidden="true">.</span>
            </h1>
            <div className="hero-v2-disciplines" data-layer="text" data-kind="role">
              {hero.disciplines.map((line, index) => (
                <span className={index === 1 ? "hero-role-roll" : undefined} data-layer="text" data-kind="role-line" key={line}>
                  <span>{line}</span>
                  {index === 1 && <span aria-hidden="true">{line}</span>}
                </span>
              ))}
            </div>
            <p className="hero-v2-introduction" data-layer="text" data-kind="introduction">{hero.introduction}</p>
            <div className="hero-v2-actions">
              <a className="hero-v2-cta magnetic-cta" data-magnetic data-magnetic-variant="outline" data-layer="button" data-kind="primary-cta" href="#work">
                <span>{hero.workCta}</span>
                <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M9 2v13m-5-5 5 5 5-5" /></svg>
              </a>
              <span className="hero-v2-location" data-layer="text" data-kind="location">
                <svg data-layer="icon" data-kind="location-pin" viewBox="0 0 16 16" aria-hidden="true"><path d="M13 6.7c0 3.2-5 7.3-5 7.3S3 9.9 3 6.7a5 5 0 1 1 10 0Z" /><circle cx="8" cy="6.5" r="1.5" /></svg>
                {hero.location}
              </span>
            </div>
          </div>

          <aside className="hero-v2-aside">
            <p className="hero-v2-aside-note" data-layer="text" data-kind="aside-note">
              <span data-layer="icon" data-kind="aside-asterisk" aria-hidden="true">✳</span>
              <em>{hero.asideNote}</em>
            </p>
            <div className="hero-v2-stats" ref={statsRef} data-layer="card" data-kind="stats-rail" role="list">
              {heroStats.map((stat) => (
                <AnimatedStat
                  key={stat.label}
                  value={stat.value}
                  label={stat.label}
                  active={statsActive}
                  motionEnabled={motionEnabled}
                />
              ))}
              {cvAvailable && (
                <a className="hero-v2-cv" data-magnetic data-layer="button" data-kind="cv-download" href={hero.cvHref ?? "/cv.pdf"}>
                  <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M9 2v10m-4-4 4 4 4-4M3 14v2h12v-2" /></svg>
                  {hero.cvLabel}
                </a>
              )}
            </div>
          </aside>

          <div className="hero-v2-marquee" aria-hidden="true">
            <div className="hero-marquee-row hero-marquee-row-one" data-layer="text" data-kind="marquee-row">
              <span>{marqueeCopy}</span><span>{marqueeCopy}</span>
            </div>
            <div className="hero-marquee-row hero-marquee-row-two" data-layer="text" data-kind="marquee-row">
              <span>{marqueeCopy}</span><span>{marqueeCopy}</span>
            </div>
          </div>

          <div className="hero-v2-reel">
            <button className="hero-v2-reel-trigger" data-cursor-label="PLAY" data-layer="button" data-kind="reel-button" type="button" onClick={() => setReelOpen(true)}>
              <span className="hero-v2-reel-circle" data-layer="icon" data-kind="reel-progress" aria-hidden="true">
                <svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" /><path d="m18 15 13 7-13 7z" /></svg>
              </span>
              <span className="hero-v2-reel-label" data-layer="text" data-kind="reel-label">{hero.reelLabel}</span>
              <span className="hero-v2-reel-meta" data-layer="text" data-kind="reel-meta">{hero.reelMetadata}</span>
            </button>
          </div>

          <div className="hero-v2-bottomline">
            <a className="hero-v2-scroll" data-magnetic data-layer="button" data-kind="scroll-cue" href="#work">
              <span>{hero.scrollLabel}</span>
              <i data-layer="line" data-kind="scroll-line" aria-hidden="true" />
            </a>
            <span className="hero-v2-footer-label" data-layer="text" data-kind="footer-label">{hero.footerLabel}</span>
          </div>
        </div>
      </section>
      {reelOpen && <ShowreelModal onClose={() => setReelOpen(false)} />}
    </>
  );
}
