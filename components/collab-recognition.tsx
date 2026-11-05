"use client";

import { useRef } from "react";
import Image from "next/image";
import { useInView } from "framer-motion";
import { portfolioContent, type Brand } from "@/data/content";
import { SectionHeader } from "@/components/section-header";
import { CountUp } from "@/components/design-primitives";

const collaborators = portfolioContent.collaborators;
const recognition = portfolioContent.recognition;

const brandNames = collaborators.brands.map((brand) => brand.name);
const brandRows = [collaborators.brands.slice(0, collaborators.rowSplit), collaborators.brands.slice(collaborators.rowSplit)];

/** One brand in the marquee. The second copy of each row only exists to make the loop seamless, so it's hidden from assistive tech and the keyboard. */
function BrandPlate({ brand, duplicate }: { brand: Brand; duplicate: boolean }) {
  const inner = (
    <>
      {brand.logo && <Image className="collab-logo" src={brand.logo} alt={duplicate || brand.label ? "" : brand.name} width={brand.width} height={brand.height} loading="eager" style={{ height: brand.height, width: "auto" }} data-layer="image" data-kind="collaboration-logo" />}
      {(!brand.logo || brand.label) && <span className="collab-wordmark" data-layer="text" data-kind="collaboration-name">{brand.label ?? brand.name}</span>}
    </>
  );
  const shared = { className: "collab-logo-plate", "data-layer": "card", "data-kind": "logo-plate", "aria-hidden": duplicate || undefined } as const;
  return brand.href
    ? <a {...shared} href={brand.href} target="_blank" rel="noreferrer" tabIndex={duplicate ? -1 : undefined} aria-label={duplicate ? undefined : brand.name}>{inner}</a>
    : <span {...shared}>{inner}</span>;
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
      <div className="collab-marquees" role="group" aria-label={brandNames.join(", ")}>
        {brandRows.map((row, rowIndex) => (
          <div className={`collab-marquee collab-marquee-${rowIndex + 1}`} key={rowIndex}>
            <div className="collab-marquee-track">
              {[row, row].flatMap((set, copy) => set.map((brand) => <BrandPlate brand={brand} duplicate={copy === 1} key={`${brand.name}-${copy}`} />))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RecognitionSection() {
  const countRef = useRef<HTMLDListElement>(null);
  const countInView = useInView(countRef, { once: true, amount: 0.4 });
  const [feature, ...rest] = recognition.entries;

  return (
    <section className="ed-section section-shell container-x" id="recognition" data-scene="recognition" aria-labelledby="recognition-heading">
      <SectionHeader
        label={recognition.eyebrow}
        titleLines={[`${recognition.titleWhite}.`, `${recognition.titleRed}.`]}
        accentLastLine
        id="recognition-heading"
      />

      <dl className="ed-numbers" ref={countRef}>
        <div data-layer="line" data-kind="recognition-tally">
          <dt data-layer="text">{recognition.countLabel}</dt>
          <dd data-layer="text" data-kind="recognition-number"><CountUp value={recognition.count} suffix={recognition.countSuffix} active={countInView} /></dd>
        </div>
        {recognition.breakdown.map((item) => (
          <div data-layer="line" data-kind="recognition-tally" key={item.label}>
            <dt data-layer="text">{item.label}</dt>
            <dd data-layer="text">{item.value}</dd>
          </div>
        ))}
      </dl>

      <article className="ed-award">
        <p className="ed-meta ed-label">
          <span data-layer="text">{feature.type}</span>
          <span data-layer="text">{feature.year}</span>
        </p>
        <p className="ed-award-result" data-layer="text" data-kind="recognition-result">{feature.result}</p>
        <div className="ed-award-body">
          <h3 data-layer="text">{feature.title}</h3>
          <div>
            <p data-layer="text">{feature.description}</p>
            <p className="ed-muted" data-layer="text">{feature.event}</p>
            <p className="ed-links">
              <a data-layer="text" data-kind="recognition-link" href={feature.href} target="_blank" rel="noreferrer">{feature.linkLabel} <span aria-hidden="true">↗</span></a>
              <a data-layer="text" data-kind="recognition-link-secondary" href={feature.projectHref} target="_blank" rel="noreferrer">{feature.projectLabel} <span aria-hidden="true">↗</span></a>
            </p>
          </div>
        </div>
      </article>

      <ol className="ed-rows">
        {rest.map((entry) => (
          <li className="ed-entry" data-layer="line" data-kind="recognition-row" key={entry.title}>
            <p className="ed-meta ed-label">
              <span data-layer="text">{entry.type}</span>
              <span data-layer="text">{entry.year}</span>
            </p>
            <h3 data-layer="text">{entry.title}</h3>
            <div>
              <p data-layer="text">{entry.description}</p>
              {entry.event && <p className="ed-muted" data-layer="text">{entry.event}</p>}
              {entry.showPartners && <p className="ed-muted" data-layer="text" data-kind="recognition-partners">Including {brandNames.join(", ")}.</p>}
              {entry.href && <p className="ed-links"><a data-layer="text" data-kind="recognition-link-secondary" href={entry.href} target="_blank" rel="noreferrer">{entry.linkLabel} <span aria-hidden="true">↗</span></a></p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
