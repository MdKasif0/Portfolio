"use client";

import { useEffect, useRef, useState } from "react";
import { portfolioContent } from "@/data/content";
import { useMotionPreference } from "@/components/motion-shell";
import { SectionHeader } from "@/components/section-header";

const about = portfolioContent.about;
const journey = portfolioContent.journey;

export function RawToRealSection() {
  const [split, setSplit] = useState(50);

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
        <div className="comparison" data-layer="card">
          <div className="comparison-layer comparison-wireframe" data-layer="image">
            <div className="comparison-sketch" aria-hidden="true">
              <span className="sketch-nav" />
              <span className="sketch-title" />
              <span className="sketch-copy" />
              <span className="sketch-copy short" />
              <span className="sketch-image" />
              <span className="sketch-button" />
              <span className="sketch-card one" />
              <span className="sketch-card two" />
            </div>
            <span className="comparison-chip" data-layer="text">{portfolioContent.rawToReal.beforeLabel}</span>
            <span className="comparison-empty-label" data-layer="text">{portfolioContent.rawToReal.beforePlaceholder}</span>
          </div>
          <div className="comparison-layer comparison-final" data-layer="image" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
            <div className="comparison-final-ui" aria-hidden="true">
              <span className="final-ui-topline" />
              <strong>MAKE IT<br /><i>MEAN SOMETHING.</i></strong>
              <span className="final-ui-copy" />
              <span className="final-ui-copy second" />
              <span className="final-ui-cta" />
              <span className="final-ui-art" />
            </div>
            <span className="comparison-chip comparison-chip-right" data-layer="text">{portfolioContent.rawToReal.afterLabel}</span>
            <span className="comparison-empty-label comparison-final-label" data-layer="text">{portfolioContent.rawToReal.afterPlaceholder}</span>
          </div>
          <div className="comparison-divider" data-layer="line" style={{ left: `${split}%` }}>
            <span aria-hidden="true">↔</span>
          </div>
          <input
            className="comparison-range"
            data-layer="button"
            type="range"
            min="0"
            max="100"
            value={split}
            onChange={(event) => setSplit(Number(event.currentTarget.value))}
            aria-label={portfolioContent.rawToReal.sliderLabel}
          />
        </div>
      </div>
      <p className="raw-real-meta" data-layer="text">
        {[portfolioContent.rawToReal.project, portfolioContent.rawToReal.year].filter(Boolean).join(" / ")}
        {portfolioContent.rawToReal.project || portfolioContent.rawToReal.year ? " · " : ""}
        UI/UX · FRONTEND · SHIPPED
      </p>
    </section>
  );
}

function AboutQuote() {
  return (
    <aside className="about-quote">
      <span className="quote-mark" data-layer="icon" aria-hidden="true">“</span>
      <blockquote data-layer="text">{about.quote}</blockquote>
      <span className="quote-signature" data-layer="text">{about.signature}</span>
      <span className="quote-footer" data-layer="text">{about.quoteFooter}</span>
    </aside>
  );
}

export function AboutSection() {
  const processRef = useRef<HTMLDivElement>(null);
  const [processVisible, setProcessVisible] = useState(false);
  const { motionEnabled } = useMotionPreference();

  useEffect(() => {
    const process = processRef.current;
    if (!process) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setProcessVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.3 });

    observer.observe(process);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="about-section section-shell container-x" id="about" data-scene="about" aria-labelledby="about-heading">
      <div className="about-heading-row">
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

      <div className="about-columns">
        <div className="about-education">
          <h3 className="micro-heading" data-layer="text">{about.educationLabel}</h3>
          <div className="education-row" data-layer="line">
            <p data-layer="text">{about.education}</p>
            {about.educationYear && <span data-layer="text">{about.educationYear}</span>}
          </div>
          <h3 className="micro-heading toolkit-heading" data-layer="text">{about.toolkitLabel}</h3>
          <div className="toolkit-tags">
            {about.skills.map((skill) => <span data-layer="text" key={skill}>{skill}</span>)}
          </div>
          <div className="tool-icons" role="group" aria-label="Creative tools">
            {about.toolIcons.map((tool) => (
              <span className="tool-icon" data-layer="icon" key={tool.name} title={tool.name} aria-label={tool.name}>{tool.short}</span>
            ))}
          </div>
        </div>

        <div className="about-process" ref={processRef}>
          <h3 className="micro-heading" data-layer="text">{about.processLabel}</h3>
          <div className="process-list">
            <span
              className={`process-line${processVisible ? " is-visible" : ""}${motionEnabled ? "" : " is-static"}`}
              data-layer="line"
              aria-hidden="true"
            />
            {about.process.map((step, index) => (
              <div className="process-step" data-layer="line" key={step.title}>
                <span className="process-node" data-layer="icon">{String(index + 1).padStart(2, "0")}</span>
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
  return (
    <section className="journey-section section-shell container-x" id="journey" data-scene="journey" aria-labelledby="journey-heading">
      <SectionHeader
        className="journey-heading"
        index={journey.eyebrow.slice(0, 2)}
        label={journey.eyebrow.slice(5)}
        titleLines={[`${journey.title}.`]}
        id="journey-heading"
        titleClassName="journey-title"
      />

      <div className="journey-layout">
        <div className="journey-roles" data-layer="line">
          <article className="journey-role journey-role-active" data-layer="card">
            <p className="journey-period" data-layer="text">{journey.activePeriod}</p>
            <div className="journey-role-copy">
              <h3 data-layer="text">{journey.activeRole}</h3>
              <p className="journey-subtitle" data-layer="text">{journey.activeSubtitle}</p>
              <p className="journey-description" data-layer="text">{journey.activeDescription.split("\n").map((line) => <span data-layer="text" key={line}>{line}</span>)}</p>
            </div>
          </article>
          {journey.roles.map((role) => (
            <article className="journey-role" data-layer="card" key={role.title}>
              {role.period && <p className="journey-period" data-layer="text">{role.period}</p>}
              <div className="journey-role-copy">
                <h3 data-layer="text">{role.title}</h3>
                <p className="journey-subtitle" data-layer="text">{role.subtitle}</p>
              </div>
            </article>
          ))}
        </div>

        <aside className="milestones">
          <p className="micro-heading" data-layer="text">{journey.milestonesLabel}</p>
          <h3 className="display-title milestones-heading" data-layer="text">
            <span>{journey.milestonesTitleWhite}<i className="title-period white-period">.</i></span>
            <span>{journey.milestonesTitleRed}<i className="title-period">.</i></span>
          </h3>
          <ol>
            {journey.milestones.map((milestone, index) => (
              <li className="milestone-row" data-layer="line" key={milestone.title}>
                <span className="milestone-index" data-layer="text">{String(index + 1).padStart(2, "0")}</span>
                <span className="milestone-title" data-layer="text">{milestone.title}</span>
                {milestone.year && <span className="milestone-year" data-layer="text">{milestone.year}</span>}
                <span className="milestone-arrow" data-layer="icon" aria-hidden="true">↗</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}
