"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { motion } from "framer-motion";
import {
  siCursor,
  siDocker,
  siFigma,
  siFirebase,
  siGit,
  siGooglegemini,
  siHuggingface,
  siJavascript,
  siMongodb,
  siN8n,
  siNetlify,
  siNextdotjs,
  siNodedotjs,
  siPostgresql,
  siPython,
  siReact,
  siSupabase,
  siSwift,
  siTailwindcss,
  siTensorflow,
  siThreedotjs,
  siTypescript
} from "simple-icons";
import type { SimpleIcon } from "simple-icons";
import { portfolioContent } from "@/data/content";
import { useMotionPreference } from "@/components/motion-shell";
import { SectionHeader } from "@/components/section-header";
import { ProductMock } from "@/components/work-section";
import type { CSSProperties } from "react";

const about = portfolioContent.about;
const journey = portfolioContent.journey;

export function RawToRealSection() {
  const [split, setSplit] = useState(50);
  const [showDragHint, setShowDragHint] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const comparisonRef = useRef<HTMLDivElement>(null);
  const demoStarted = useRef(false);
  const gitRoasted = portfolioContent.work.projects[0];
  const { motionEnabled } = useMotionPreference();

  useEffect(() => {
    const comparison = comparisonRef.current;
    if (!comparison || !motionEnabled) return;
    const timers: number[] = [];
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || demoStarted.current || hasInteracted) return;
      demoStarted.current = true;
      setIsDemo(true);
      setSplit(14);
      timers.push(window.setTimeout(() => setSplit(76), 80));
      timers.push(window.setTimeout(() => setSplit(50), 1450));
      timers.push(window.setTimeout(() => setIsDemo(false), 2700));
    }, { threshold: 0.35 });
    observer.observe(comparison);
    return () => {
      observer.disconnect();
      timers.forEach(window.clearTimeout);
    };
  }, [hasInteracted, motionEnabled]);

  const setSplitFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const next = Math.round(((event.clientX - bounds.left) / bounds.width) * 100);
    setSplit(Math.max(0, Math.min(100, next)));
  };

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setHasInteracted(true);
    setShowDragHint(false);
    setIsDragging(true);
    setSplitFromPointer(event);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) setSplitFromPointer(event);
  };

  return (
    <section className="raw-real-section section-shell container-x" id="raw-real" data-scene="raw-real" aria-labelledby="raw-real-heading">
      <SectionHeader
        className="raw-real-heading"
        label={portfolioContent.rawToReal.eyebrow}
        titleLines={[`${portfolioContent.rawToReal.titleBefore}.`, `${portfolioContent.rawToReal.titleAfter}.`]}
        accentLastLine
        id="raw-real-heading"
        titleClassName="raw-real-title"
      />
      <div className="raw-real-layout">
        <p className="raw-real-caption" data-layer="text">{portfolioContent.rawToReal.caption}</p>
        <div className={`comparison${isDemo ? " is-demo" : ""}`} ref={comparisonRef} data-cursor-label="DRAG" data-layer="card" data-kind="wire-to-real-comparison">
          <div className="comparison-layer comparison-wireframe" data-layer="image" data-kind="wireframe-panel">
            <ProductMock project={gitRoasted} mode="wire" />
            <span className="comparison-chip" data-layer="text">{portfolioContent.rawToReal.beforeLabel}</span>
          </div>
          <motion.div
            className="comparison-layer comparison-final"
            data-layer="image"
            data-kind="final-panel"
            animate={{ clipPath: `inset(0 0 0 ${split}%)` }}
            transition={isDragging ? { duration: 0 } : { type: "spring", stiffness: 250, damping: 28, mass: 0.5 }}
          >
            <ProductMock project={gitRoasted} mode="final" />
            <span className="comparison-chip comparison-chip-right" data-layer="text">{portfolioContent.rawToReal.afterLabel}</span>
          </motion.div>
          <motion.div
            className="comparison-divider"
            data-layer="line"
            data-kind="comparison-handle"
            animate={{ left: `${split}%` }}
            transition={isDragging ? { duration: 0 } : { type: "spring", stiffness: 250, damping: 28, mass: 0.5 }}
          >
            <span aria-hidden="true">↔</span>
          </motion.div>
          <div
            className="comparison-range"
            data-layer="button"
            data-kind="comparison-slider"
            role="slider"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={split}
            aria-valuetext={`${split}% final interface`}
            onPointerDown={beginDrag}
            onPointerMove={moveDrag}
            onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setIsDragging(false); }}
            onPointerCancel={() => setIsDragging(false)}
            onKeyDown={(event) => {
              const increment = event.shiftKey ? 10 : 2;
              if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                event.preventDefault(); setHasInteracted(true); setShowDragHint(false); setSplit((value) => Math.max(0, value - increment));
              }
              if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                event.preventDefault(); setHasInteracted(true); setShowDragHint(false); setSplit((value) => Math.min(100, value + increment));
              }
              if (event.key === "Home") { event.preventDefault(); setSplit(0); }
              if (event.key === "End") { event.preventDefault(); setSplit(100); }
            }}
            aria-label={portfolioContent.rawToReal.sliderLabel}
          />
          {showDragHint && <span className="comparison-drag-hint" data-layer="text" data-kind="drag-hint">DRAG <i>↔</i></span>}
        </div>
      </div>
      <p className="raw-real-meta" data-layer="text">
        {portfolioContent.rawToReal.project}
        {portfolioContent.rawToReal.year ? ` / ${portfolioContent.rawToReal.year}` : ""}
        {" · UI/UX · FRONTEND · SHIPPED"}
      </p>
    </section>
  );
}

const simpleIconsByName: Record<string, SimpleIcon> = {
  JavaScript: siJavascript,
  TypeScript: siTypescript,
  React: siReact,
  "Next.js": siNextdotjs,
  "Node.js": siNodedotjs,
  Python: siPython,
  Firebase: siFirebase,
  MongoDB: siMongodb,
  PostgreSQL: siPostgresql,
  TensorFlow: siTensorflow,
  "Hugging Face": siHuggingface,
  Cursor: siCursor,
  "n8n": siN8n,
  Git: siGit,
  Docker: siDocker,
  Netlify: siNetlify,
  Swift: siSwift,
  "Tailwind CSS": siTailwindcss,
  "Three.js": siThreedotjs,
  Supabase: siSupabase,
  Gemini: siGooglegemini,
  Figma: siFigma
};

function ToolkitIcon({ name }: { name: string }) {
  const icon = simpleIconsByName[name];
  if (name === "OpenAI") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.8a4.8 4.8 0 0 1 4.7 3.8 4.8 4.8 0 0 1 3.4 6.7 4.8 4.8 0 0 1-3.1 7.1 4.8 4.8 0 0 1-8 0 4.8 4.8 0 0 1-3.1-7.1 4.8 4.8 0 0 1 3.4-6.7A4.8 4.8 0 0 1 12 2.8Zm0 2.1a2.7 2.7 0 0 0-2.7 2.7v8.8a2.7 2.7 0 0 0 5.4 0V7.6A2.7 2.7 0 0 0 12 4.9Zm-5.8 5a2.7 2.7 0 0 0-.3 3.8l5.8 6.4a2.7 2.7 0 0 0 4-3.6l-5.8-6.4a2.7 2.7 0 0 0-3.7-.2Zm11.6 0a2.7 2.7 0 0 0-3.7.2l-5.8 6.4a2.7 2.7 0 0 0 4 3.6l5.8-6.4a2.7 2.7 0 0 0-.3-3.8Z" />
      </svg>
    );
  }
  if (!icon) return null;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={icon.path} /></svg>;
}

function ProcessGlyph({ index }: { index: number }) {
  const paths = [
    <><circle cx="12" cy="12" r="7" /><path d="M12 1v3m0 16v3M1 12h3m16 0h3m-16.5-7.5 2 2m9 9 2 2m0-13-2 2m-9 9-2 2" /></>,
    <><path d="M5 5h14M5 12h9M5 19h14" /><circle cx="18" cy="12" r="2" /></>,
    <><path d="m4 17 10-10 4 4L8 21H4v-4Zm9-9 4 4M16 5l3-3 3 3-3 3" /></>,
    <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Zm7 13 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>,
    <><path d="M4 12h14m-5-5 5 5-5 5" /><path d="M4 5v14" /></>
  ];
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[index]}</svg>;
}

function AboutQuote() {
  return (
    <aside className="about-quote" data-layer="card" data-kind="about-quote">
      <span className="quote-mark" data-layer="icon" data-kind="quote-mark" aria-hidden="true">“</span>
      <blockquote data-layer="text">{about.quote}</blockquote>
      <span className="quote-signature" data-layer="text" data-kind="quote-signature">
        <span>{about.signature}</span>
        <svg viewBox="0 0 170 34" aria-hidden="true"><path d="M4 26c8-1 13-16 17-17 3-1-3 17 1 18 5 1 11-16 14-15 2 1-1 10 2 11 3 1 7-5 10-8 2-2 1 4 4 5 4 2 9-5 15-7-2 5-2 9 2 10 7 3 15-5 22-8 5-2 11-4 16-2 4 2 4 7 1 10-3 3-9 3-11 0-2-3 1-7 4-8 6-2 11 1 17 5 9 6 19 6 29 2" /></svg>
      </span>
      <span className="quote-footer" data-layer="text">{about.quoteFooter}</span>
    </aside>
  );
}

export function AboutSection() {
  const processRef = useRef<HTMLDivElement>(null);
  const [processVisible, setProcessVisible] = useState(false);
  const [activeProcess, setActiveProcess] = useState(0);
  const { motionEnabled } = useMotionPreference();

  useEffect(() => {
    const process = processRef.current;
    if (!process) return;

    const processObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setProcessVisible(true);
      }
    }, { threshold: 0.3 });

    processObserver.observe(process);
    const stepObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const index = Array.from(process.querySelectorAll(".process-step")).indexOf(entry.target as HTMLElement);
          if (index >= 0) setActiveProcess(index);
        }
      }
    }, { rootMargin: "-46% 0px -46% 0px", threshold: 0 });
    process.querySelectorAll(".process-step").forEach((step) => stepObserver.observe(step));
    return () => {
      processObserver.disconnect();
      stepObserver.disconnect();
    };
  }, []);

  return (
    <section className="about-section section-shell container-x" id="about" data-scene="about" aria-labelledby="about-heading">
      <div className="about-heading-row">
        <div className="about-heading-main">
          <SectionHeader
            className="about-section-header"
            index={about.eyebrow.slice(0, 2)}
            label={about.eyebrow.slice(5)}
            titleLines={[`${about.titleBefore}.`, `${about.titleAfter}.`]}
            accentLastLine
            id="about-heading"
            titleClassName="about-heading"
          />
          <p className="about-bio" data-layer="text">
            {about.bioLines.map((line) => <span data-layer="text" key={line}>{line}</span>)}
          </p>
        </div>
      </div>

      <div className="about-columns">
        <div className="about-education">
          <h3 className="micro-heading" data-layer="text">{about.educationLabel}</h3>
          <div className="education-row" data-layer="line">
            <div><p data-layer="text">{about.education}</p><span className="education-status" data-layer="text">CURRENTLY STUDYING</span></div>
            {about.educationYear && <span data-layer="text">{about.educationYear}</span>}
          </div>
          <h3 className="micro-heading toolkit-heading" data-layer="text">{about.toolkitLabel}</h3>
          <div className="toolkit-groups">
            {about.toolkitGroups.map((group) => (
              <div className="toolkit-group" key={group.label}>
                <h4 data-layer="text">{group.label}</h4>
                <div className="toolkit-tags">
                  {group.skills.map((skill) => (
                    <span className="toolkit-chip" data-layer="card" data-kind="toolkit-chip" key={skill} style={{ "--tool-color": skill === "OpenAI" ? "#74aa9c" : `#${simpleIconsByName[skill]?.hex ?? "f2503e"}` } as CSSProperties}>
                      <ToolkitIcon name={skill} /><span data-layer="text">{skill}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="about-process" ref={processRef} data-layer="card" data-kind="process-card">
          <h3 className="micro-heading" data-layer="text">{about.processLabel}</h3>
          <div className="process-list">
            <span
              className={`process-line${processVisible ? " is-visible" : ""}${motionEnabled ? "" : " is-static"}`}
              data-layer="line"
              aria-hidden="true"
            />
            {about.process.map((step, index) => (
              <div className={`process-step${activeProcess === index ? " is-active" : ""}`} data-layer="line" data-kind="process-step" key={step.title}>
                <span className="process-node" data-layer="icon" data-kind="process-node"><ProcessGlyph index={index} /></span>
                <div>
                  <h4 data-layer="text">{step.title}</h4>
                  <p data-layer="text">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <AboutQuote />
      </div>
    </section>
  );
}

export function JourneySection() {
  const [openRole, setOpenRole] = useState(0);
  const allRoles = [
    { title: journey.activeRole, subtitle: journey.activeSubtitle, description: journey.activeDescription, period: journey.activePeriod, now: true },
    ...journey.roles.map((role) => ({ ...role, description: role.subtitle, now: false }))
  ];
  return (
    <section className="journey-section section-shell container-x" id="journey" data-scene="journey" aria-labelledby="journey-heading">
      <SectionHeader
        className="journey-heading"
        index={journey.eyebrow.slice(0, 2)}
        label={journey.eyebrow.slice(5)}
        titleLines={["KEEP MOVING.", "KEEP BUILDING."]}
        accentLastLine
        id="journey-heading"
        titleClassName="journey-title"
      />

      <div className="journey-layout">
        <div className="journey-roles" data-layer="line" data-kind="journey-timeline">
          {allRoles.map((role, index) => {
            const expanded = openRole === index;
            return <article className={`journey-role${role.now ? " journey-role-active" : ""}${expanded ? " is-open" : ""}`} data-layer="card" data-kind="journey-role" key={role.title}>
              {role.period && <p className="journey-period" data-layer="text">{role.now ? "NOW" : role.period}</p>}
              <button className="journey-role-toggle" type="button" onClick={() => setOpenRole(expanded ? -1 : index)} aria-expanded={expanded}>
                <span className="journey-role-copy">
                  <h3 data-layer="text">{role.title}</h3>
                  <p className="journey-subtitle" data-layer="text">{role.subtitle}</p>
                </span>
                <span className="journey-expand" aria-hidden="true">{expanded ? "−" : "+"}</span>
              </button>
              {expanded && <p className="journey-description" data-layer="text">{role.description}</p>}
            </article>;
          })}
        </div>

        <aside className="milestones">
          <p className="micro-heading" data-layer="text">{journey.milestonesLabel}</p>
          <h3 className="display-title milestones-heading" data-layer="text">
            <span>{journey.milestonesTitleWhite}<i className="title-period white-period">.</i></span>
            <span>{journey.milestonesTitleRed}<i className="title-period">.</i></span>
          </h3>
          <ol>
            {journey.milestones.map((milestone, index) => (
              <li className="milestone-row" data-cursor-label="VIEW" data-layer="line" data-kind="milestone-row" key={milestone.title}>
                <span className="milestone-index" data-layer="text">{String(index + 1).padStart(2, "0")}</span>
                <span className="milestone-title" data-layer="text">{milestone.title}</span>
                {milestone.year && <span className="milestone-year" data-layer="text">{milestone.year}</span>}
                <span className="milestone-arrow" data-layer="icon" aria-hidden="true">↗</span>
                <span className="milestone-preview" aria-hidden="true"><b>{String(index + 1).padStart(2, "0")}</b><i /></span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}
