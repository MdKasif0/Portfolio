"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
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
import type { CSSProperties } from "react";

const about = portfolioContent.about;
const journey = portfolioContent.journey;

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
      {/* The avatar rides the card's ring like a planet on its orbit (same geometry and drift as the ring). */}
      <span className="quote-orbit" aria-hidden="true">
        <span className="quote-avatar" data-layer="image" data-kind="quote-avatar">
          <span className="quote-avatar-face"><Image src="/hero-cutout-mobile.webp" alt="" width={640} height={640} sizes="96px" /></span>
          <i className="quote-avatar-status" />
        </span>
      </span>
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
  const { motionEnabled } = useMotionPreference();
  const [lead, ...bio] = about.bioLines;

  useEffect(() => {
    const process = processRef.current;
    if (!process) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setProcessVisible(true);
    }, { threshold: 0.3 });
    observer.observe(process);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="about-section section-shell container-x" id="about" data-scene="about" aria-labelledby="about-heading">
      <SectionHeader
        className="about-section-header"
        index={about.eyebrow.slice(0, 2)}
        label={about.eyebrow.slice(5)}
        titleLines={[`${about.titleBefore}.`, `${about.titleAfter}.`]}
        accentLastLine
        id="about-heading"
        titleClassName="about-heading"
      />

      <div className="about-grid">
        <div className="about-bio">
          <p className="about-lead" data-layer="text" data-kind="about-lead">{lead}</p>
          {bio.map((line) => <p data-layer="text" data-kind="about-bio-line" key={line}>{line}</p>)}
        </div>

        <div className="about-education about-panel" data-layer="card" data-kind="education-card">
          <div className="about-panel-top">
            <h3 className="micro-heading" data-layer="text">{about.educationLabel}</h3>
            <span className="education-status" data-layer="text" data-kind="education-status"><i aria-hidden="true" />{about.educationStatus}</span>
          </div>
          <p className="education-degree" data-layer="text" data-kind="education-degree">{about.educationDegree}</p>
          <p className="education-school" data-layer="text">{about.educationSchool}</p>
          <p className="education-year" data-layer="text">{about.educationYear}</p>
        </div>

        <div className="about-toolkit about-panel" data-layer="card" data-kind="toolkit-panel">
          <h3 className="micro-heading" data-layer="text">{about.toolkitLabel}</h3>
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

        <AboutQuote />

        <div className="about-process about-panel" ref={processRef} data-layer="card" data-kind="process-card">
          <h3 className="micro-heading" data-layer="text">{about.processLabel}</h3>
          <ol className="process-list">
            <span
              className={`process-line${processVisible ? " is-visible" : ""}${motionEnabled ? "" : " is-static"}`}
              data-layer="line"
              data-kind="process-line"
              aria-hidden="true"
            />
            {about.process.map((step, index) => (
              <li className="process-step" data-layer="line" data-kind="process-step" key={step.title}>
                <span className="process-node" data-layer="icon" data-kind="process-node"><ProcessGlyph index={index} /></span>
                <div>
                  <h4 data-layer="text">{step.title}</h4>
                  <p data-layer="text">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function JourneySection() {
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
        <div className="journey-timeline">
          <i className="journey-rail" data-layer="line" data-kind="journey-rail" aria-hidden="true" />
          <article className="journey-current" data-layer="card" data-kind="journey-current">
            <div className="journey-current-top">
              <span className="journey-now" data-layer="text" data-kind="journey-now"><i aria-hidden="true" />{journey.nowLabel}</span>
              <span className="journey-period" data-layer="text">{journey.activePeriod}</span>
            </div>
            <h3 data-layer="text">{journey.activeRole}</h3>
            <p className="journey-subtitle" data-layer="text">{journey.activeSubtitle}</p>
            <ul className="journey-points">
              {journey.activePoints.map((point) => <li data-layer="text" data-kind="journey-point" key={point}>{point}</li>)}
            </ul>
          </article>
          <ol className="journey-roles">
            {journey.roles.map((role) => (
              <li className="journey-role" data-layer="card" data-kind="journey-role" key={role.title}>
                <span className="journey-period" data-layer="text">{role.period}</span>
                <div>
                  <h3 data-layer="text">{role.title}</h3>
                  <p className="journey-subtitle" data-layer="text">{role.subtitle}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className="milestones" data-layer="card" data-kind="milestones-panel">
          <p className="micro-heading" data-layer="text">{journey.milestonesLabel}</p>
          <h3 className="display-title milestones-heading" data-layer="text" data-kind="milestones-heading">
            <span>{journey.milestonesTitleWhite}<i className="title-period">.</i></span>
            <span>{journey.milestonesTitleRed}<i className="title-period">.</i></span>
          </h3>
          <ol>
            {journey.milestones.map((milestone) => {
              const internal = milestone.href.startsWith("#");
              return (
                <li key={milestone.title}>
                  <a className="milestone-row" data-layer="line" data-kind="milestone-row" href={milestone.href} {...(internal ? {} : { target: "_blank", rel: "noreferrer" })}>
                    <span className="milestone-year" data-layer="text">{milestone.year}</span>
                    <span className="milestone-title" data-layer="text">{milestone.title}</span>
                    <span className="milestone-arrow" data-layer="icon" aria-hidden="true">{internal ? "↓" : "↗"}</span>
                  </a>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </section>
  );
}
