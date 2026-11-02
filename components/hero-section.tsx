"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { portfolioContent } from "@/data/content";
import { useMotionPreference } from "@/components/motion-shell";
import { ShowreelModal } from "@/components/showreel-modal";

const hero = portfolioContent.hero;

function AnimatedStat({ value, label, active, motionEnabled }: { value?: string; label: string; active: boolean; motionEnabled: boolean }) {
  const numericValue = value === undefined ? Number.NaN : Number(value);
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
      const progress = Math.min((now - start) / 1500, 1);
      setCount(Math.round(numericValue * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [active, numericValue]);

  if (!value) return null;
  return (
    <div className="hero-stat" data-layer="text">
      <span className="hero-stat-value" data-layer="text">
        {Number.isFinite(numericValue) && motionEnabled && active ? count : value}
        <span className="stat-period">.</span>
      </span>
      <span className="hero-stat-label" data-layer="text">{label}</span>
    </div>
  );
}

export function HeroSection() {
  const { motionEnabled } = useMotionPreference();
  const [reelOpen, setReelOpen] = useState(false);
  const [entranceReady, setEntranceReady] = useState(false);
  const [cutoutLoaded, setCutoutLoaded] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, amount: 0.4 });
  const statsActive = statsInView && motionEnabled;
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 48]);

  useEffect(() => {
    const updateVisibility = () => setEntranceReady(motionEnabled && document.visibilityState === "visible");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, [motionEnabled]);

  return (
    <>
      <section className={`hero hero-stage${entranceReady ? " hero-animate" : ""}`} id="top" data-scene="hero" ref={sectionRef} aria-labelledby="hero-title">
        <div className="hero-backdrop-frame" aria-hidden="true">
          <motion.div
            className="hero-backdrop-word"
            data-layer="text"
            style={{ y: motionEnabled ? backgroundY : 0 }}
          >
            {hero.backgroundWord}
          </motion.div>
        </div>

        <div className="hero-topline section-shell container-x">
          <div className="hero-eyebrow">
            {hero.eyebrow.map((line) => <span data-layer="text" key={line}>{line}</span>)}
          </div>
          <div className="availability" data-layer="text"><span aria-hidden="true" />{hero.availability}</div>
        </div>

        <motion.div
          className="hero-portrait"
          data-layer="image"
          aria-label="Portrait of Md Kasif Uddin"
          style={{ y: motionEnabled ? imageY : 0 }}
        >
          <div className="portrait-rim" aria-hidden="true" />
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
          {!cutoutLoaded && <span className="portrait-placeholder">{hero.cutoutPlaceholder}</span>}
        </motion.div>

        <div className="hero-copy section-shell container-x">
          <div className="hero-copy-inner">
            <p className="hero-script hero-reveal-line" data-layer="text">{hero.greeting}</p>
            <h1 id="hero-title" className="display-title hero-name hero-reveal-line" data-layer="text">
              {portfolioContent.identity.displayName}<span className="title-period">.</span>
            </h1>
            <div className="hero-disciplines hero-reveal-line" data-layer="text">
              {hero.disciplines.map((line) => <span data-layer="text" key={line}>{line}</span>)}
            </div>
            <p className="hero-introduction hero-reveal-line" data-layer="text">{hero.introduction}</p>
            <div className="hero-actions hero-reveal-line">
              <a className="hero-cta magnetic-cta" data-layer="button" href="#work">{hero.workCta}<span aria-hidden="true">↓</span></a>
              <span className="hero-location" data-layer="text">
                <svg data-layer="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M13 6.7c0 3.2-5 7.3-5 7.3S3 9.9 3 6.7a5 5 0 1 1 10 0Z" /><circle cx="8" cy="6.5" r="1.5" /></svg>
                {hero.location}
              </span>
            </div>
          </div>
        </div>

        <div className="hero-reel section-shell container-x">
          <button className="reel-trigger" data-layer="button" type="button" onClick={() => setReelOpen(true)}>
            <span className="reel-play" data-layer="icon" aria-hidden="true"><span /></span>
            <span className="reel-label" data-layer="text">{hero.reelLabel}</span>
            <span className="reel-metadata" data-layer="text">{hero.reelMetadata}</span>
          </button>
        </div>

        <aside className="hero-aside">
          <div className="hero-aside-note" data-layer="text"><span aria-hidden="true">✳</span><em>{hero.asideNote}</em></div>
          <div className="hero-stats" ref={statsRef}>
            {hero.stats.map((stat) => <AnimatedStat key={stat.label} {...stat} active={statsActive} motionEnabled={motionEnabled} />)}
            {hero.cvHref && <a className="cv-link" data-layer="button" href={hero.cvHref}><span aria-hidden="true">↓</span> {hero.cvLabel}</a>}
          </div>
        </aside>

        <div className="hero-bottomline section-shell container-x">
          <a data-layer="text" href="#work">{hero.scrollLabel}</a>
          <span data-layer="text">{hero.footerLabel}</span>
        </div>
      </section>
      {reelOpen && <ShowreelModal onClose={() => setReelOpen(false)} />}
    </>
  );
}
