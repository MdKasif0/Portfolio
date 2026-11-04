"use client";

import { useRef, type CSSProperties } from "react";
import { useInView } from "framer-motion";
import { portfolioContent } from "@/data/content";
import { SectionHeader } from "@/components/section-header";
import { CountUp } from "@/components/design-primitives";

const collaborators = portfolioContent.collaborators;
const recognition = portfolioContent.recognition;

/** The award seal on the feature card: a slow tick ring around a star, echoing the hero's HUD. */
function AwardSeal() {
  return (
    <svg className="recognition-seal" data-layer="icon" data-kind="recognition-seal" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <g className="recognition-seal-ring" stroke="currentColor" strokeLinecap="round">
        {Array.from({ length: 48 }, (_, tick) => (
          <path key={tick} d={tick % 4 === 0 ? "M60 3v8" : "M60 3v4"} transform={`rotate(${tick * 7.5} 60 60)`} />
        ))}
      </g>
      <circle cx="60" cy="60" r="40" stroke="currentColor" strokeOpacity=".45" />
      <path d="m60 40 5.9 13.1 14.1 1.6-10.5 9.6 2.9 14-12.4-7.1-12.4 7.1 2.9-14-10.5-9.6 14.1-1.6L60 40Z" fill="currentColor" />
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
          <b><CountUp value={collaborators.count} suffix={collaborators.countSuffix} active={countInView} /></b> {collaborators.countLabel}
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
        <div className="recognition-intro-head">
          <SectionHeader
            label={recognition.eyebrow}
            titleLines={[`${recognition.titleWhite}.`, `${recognition.titleRed}.`]}
            accentLastLine
            id="recognition-heading"
            titleClassName="recognition-heading"
          />
          <p className="recognition-summary" data-layer="text">{recognition.summary}</p>
        </div>
        <div className="recognition-tally" ref={countRef}>
          <span className="recognition-number" data-layer="text" data-kind="recognition-number"><CountUp value={recognition.count} suffix={recognition.countSuffix} active={countInView} /></span>
          <span className="recognition-count-label" data-layer="text" data-kind="recognition-count-label">{recognition.countLabel}</span>
          <dl className="recognition-breakdown">
            {recognition.breakdown.map((item) => (
              <div className="recognition-breakdown-item" data-layer="card" data-kind="recognition-breakdown" key={item.label}>
                <dd data-layer="text">{item.value}</dd>
                <dt data-layer="text">{item.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="recognition-list">
        <div className="recognition-list-heading">
          <span data-layer="text">{recognition.listLabel}</span>
          <i data-layer="line" data-kind="recognition-list-rule" aria-hidden="true" />
        </div>
        <ol className="recognition-board">
          {recognition.entries.map((entry, index) => (
            <li className={entry.result ? "recognition-feature" : "recognition-card"} data-layer="card" data-kind={entry.result ? "recognition-feature" : "recognition-card"} key={entry.title}>
              <div className="recognition-card-top">
                <span className="recognition-row-index" data-layer="text">{String(index + 1).padStart(2, "0")}</span>
                <span className="recognition-type" data-layer="text" data-kind="recognition-type">{entry.type}</span>
                <span className="recognition-year" data-layer="text">{entry.year}</span>
              </div>
              {entry.result && <AwardSeal />}
              {entry.result && <p className="recognition-result" data-layer="text" data-kind="recognition-result">{entry.result}</p>}
              <h3 data-layer="text">{entry.title}</h3>
              <p className="recognition-description" data-layer="text">{entry.description}</p>
              {entry.event && <p className="recognition-event" data-layer="text">{entry.event}</p>}
              {entry.showPartners && (
                <ul className="recognition-partners" aria-label={`${collaborators.count}${collaborators.countSuffix} brand collaborators, including`}>
                  {collaborators.names.map((name) => <li data-layer="text" data-kind="recognition-partner" key={name}>{name}</li>)}
                </ul>
              )}
              {entry.href && (
                <div className="recognition-links">
                  <a className={`recognition-link${entry.result ? " is-primary" : ""}`} data-magnetic data-layer="button" data-kind="recognition-link" href={entry.href} target="_blank" rel="noreferrer">{entry.linkLabel} <span aria-hidden="true">↗</span></a>
                  {entry.projectHref && <a className="recognition-link" data-magnetic data-layer="button" data-kind="recognition-link-secondary" href={entry.projectHref} target="_blank" rel="noreferrer">{entry.projectLabel} <span aria-hidden="true">↗</span></a>}
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
