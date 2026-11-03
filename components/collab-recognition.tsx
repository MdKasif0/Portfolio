"use client";

import { useRef, type CSSProperties } from "react";
import { motion, useInView } from "framer-motion";
import { portfolioContent } from "@/data/content";
import { SectionHeader } from "@/components/section-header";
import { CountUp } from "@/components/design-primitives";

const collaborators = portfolioContent.collaborators;
const recognition = portfolioContent.recognition;

function LaurelWreath() {
  return (
    <svg className="laurel-wreath" data-layer="icon" viewBox="0 0 220 220" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M56 178C21 145 22 91 61 46" />
        <path d="M164 178c35-33 34-87-5-132" />
        <path d="M47 164c-17-1-26-12-28-26 16-1 27 8 28 26Z" />
        <path d="M37 139c-16-5-23-18-20-32 16 3 25 14 20 32Z" />
        <path d="M35 111c-14-8-18-22-12-35 15 7 21 20 12 35Z" />
        <path d="M42 84c-11-12-11-26-2-37 12 11 15 25 2 37Z" />
        <path d="M54 61c-7-14-3-28 9-36 8 14 7 28-9 36Z" />
        <path d="M173 164c17-1 26-12 28-26-16-1-27 8-28 26Z" />
        <path d="M183 139c16-5 23-18 20-32-16 3-25 14-20 32Z" />
        <path d="M185 111c14-8 18-22 12-35-15 7-21 20-12 35Z" />
        <path d="M178 84c11-12 11-26 2-37-12 11-15 25-2 37Z" />
        <path d="M166 61c7-14 3-28-9-36-8 14-7 28 9 36Z" />
        <path d="M56 178c18 11 34 15 54 15s36-4 54-15" />
      </g>
    </svg>
  );
}

export function CollaboratorStrip() {
  const countRef = useRef<HTMLDivElement>(null);
  const countInView = useInView(countRef, { once: true, amount: 0.6 });

  return (
    <section className="collab-strip section-shell container-x" data-build-section="collaborators" data-scene="collaborators" aria-label="Collaborations">
      <div className="collab-strip-copy">
        <div className="collab-strip-label">
          <span data-layer="text">{collaborators.label}</span>
          <strong data-layer="text">{collaborators.title}</strong>
        </div>
        <p className="collab-count" ref={countRef} data-layer="text" data-kind="collaboration-count">
          <b><CountUp value={collaborators.count} active={countInView} /></b> {collaborators.countLabel}
        </p>
      </div>
      <div className="collab-marquees" aria-label={collaborators.names.join(", ")}>
        {[1, -1].map((direction, row) => (
          <div className={`collab-marquee collab-marquee-${row + 1}`} key={row}>
            <div className="collab-marquee-track" style={{ "--marquee-direction": direction } as CSSProperties}>
              {[...collaborators.names, ...collaborators.names].map((name, index) => (
                <span className="collab-logo-plate" data-layer="card" data-kind="logo-plate" aria-hidden={index >= collaborators.names.length} key={`${name}-${index}`}>
                  <span className="collab-wordmark" data-layer="text" data-kind="collaboration-logo">{name}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RecognitionSection() {
  const countRef = useRef<HTMLDivElement>(null);
  const countInView = useInView(countRef, { once: true, amount: 0.4 });

  return (
    <section className="recognition-section section-shell container-x" id="recognition" data-scene="recognition" data-layer="card" data-kind="recognition-panel" aria-labelledby="recognition-heading">
      <span className="recognition-aurora recognition-aurora-one" aria-hidden="true" />
      <span className="recognition-aurora recognition-aurora-two" aria-hidden="true" />
      <div className="recognition-intro">
        <SectionHeader
          label={recognition.eyebrow}
          titleLines={[`${recognition.titleWhite}.`, `${recognition.titleRed}.`]}
          accentLastLine
          id="recognition-heading"
          titleClassName="recognition-heading"
        />
        <div className="recognition-count-wrap">
          <div className="recognition-count" ref={countRef} data-layer="card" data-kind="recognition-count">
            <LaurelWreath />
            <span className="recognition-number" data-layer="text" data-kind="recognition-number"><CountUp value={recognition.count} active={countInView} /></span>
          </div>
          <span className="recognition-count-label" data-layer="text">{recognition.countLabel}</span>
        </div>
        <p className="recognition-summary" data-layer="text">{recognition.summary}</p>
        {recognition.proofHref && <a className="recognition-proof" data-magnetic data-layer="button" href={recognition.proofHref}>{recognition.proofLabel} <span aria-hidden="true">↗</span></a>}
      </div>

      <div className="recognition-list">
        <div className="recognition-list-heading">
          <span data-layer="text">{recognition.listLabel}</span>
          <span data-layer="text">{recognition.yearColumn}</span>
        </div>
        <ol>
          {recognition.entries.map((entry, index) => (
            <li className="recognition-row" data-layer="card" data-kind="recognition-row" key={entry.title}>
              <motion.div className="recognition-row-sweep" aria-hidden="true" />
              <div className="recognition-row-main">
                <span className="recognition-row-index" data-layer="text">{String(index + 1).padStart(2, "0")}</span>
                <h3 data-layer="text">{entry.title}</h3>
                <span className="recognition-type" data-layer="text" data-kind="recognition-type">{entry.type}</span>
                {entry.year && <span className="recognition-year" data-layer="text">{entry.year}</span>}
                <span className="recognition-row-arrow" aria-hidden="true">↗</span>
              </div>
              <p className="recognition-row-subtitle" data-layer="text">{entry.subtitle}</p>
              {entry.type === "COLLAB" && (
                <div className="recognition-avatar-stack" aria-label="Six brand collaborators">
                  {collaborators.names.map((name, collaboratorIndex) => (
                    <span data-layer="icon" data-kind="recognition-avatar" title={name} key={name} style={{ "--avatar-index": collaboratorIndex } as CSSProperties}>{name.slice(0, 1)}</span>
                  ))}
                </div>
              )}
              {entry.href && <a className="recognition-row-link" data-cursor-label="OPEN" href={entry.href} target="_blank" rel="noreferrer">VIEW PROOF <span aria-hidden="true">↗</span></a>}
              {!entry.href && <span className="recognition-row-note">PARTICIPATION & COLLABORATION</span>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
