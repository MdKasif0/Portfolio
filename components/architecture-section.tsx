"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { portfolioContent } from "@/data/content";
import { systems } from "@/data/systems";
import { ArchitectureDiagram, SystemFacts } from "@/components/architecture-diagram";
import { SectionHeader } from "@/components/section-header";
import { track } from "@/lib/analytics";

const copy = portfolioContent.architecture;

export function ArchitectureSection() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const system = systems[active];

  const choose = (index: number) => {
    setActive(index);
    track("architecture-tab", { system: systems[index].id });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (active + step + systems.length) % systems.length;
    choose(next);
    tabs.current[next]?.focus();
  };

  return (
    <section className="architecture-section section-shell container-x" id="architecture" data-scene="architecture" aria-labelledby="architecture-heading">
      <div className="architecture-top">
        <SectionHeader
          className="architecture-heading"
          label={copy.eyebrow}
          titleLines={[...copy.titleLines]}
          accentLastLine
          id="architecture-heading"
          titleClassName="architecture-title"
        />
        <p className="architecture-caption" data-layer="text">{copy.caption}</p>
      </div>

      <div className="arch-tabs" role="tablist" aria-label={copy.tabsLabel} data-layer="card" data-kind="arch-tabs">
        {systems.map((item, index) => (
          <button
            key={item.id}
            ref={(node) => { tabs.current[index] = node; }}
            className="arch-tab"
            role="tab"
            type="button"
            id={`arch-tab-${item.id}`}
            aria-selected={index === active}
            aria-controls="arch-panel"
            tabIndex={index === active ? 0 : -1}
            data-layer="button"
            data-kind="arch-tab"
            onClick={() => choose(index)}
            onKeyDown={onKeyDown}
          >
            <strong>{item.name}</strong>
            <span>{item.kicker}</span>
          </button>
        ))}
      </div>

      <div className="arch-panel" id="arch-panel" role="tabpanel" aria-labelledby={`arch-tab-${system.id}`} key={system.id}>
        <p className="arch-summary" data-layer="text">{system.summary}</p>
        <ArchitectureDiagram diagram={system.diagram} label={`${system.name} request path`} />
        <SystemFacts facts={system.facts} />

        <h3 className="arch-subhead" data-layer="text">{copy.tradeOffsLabel}</h3>
        <ul className="arch-tradeoffs">
          {system.tradeOffs.map((item) => (
            <li className="arch-tradeoff" key={item.chose} data-layer="card" data-kind="arch-tradeoff">
              <strong data-layer="text">{item.chose}</strong>
              <span className="arch-over" data-layer="text">over {item.over.charAt(0).toLowerCase() + item.over.slice(1)}</span>
              <p data-layer="text">{item.why}</p>
              <p className="arch-cost" data-layer="text"><b>The cost</b> {item.cost}</p>
            </li>
          ))}
        </ul>

        <div className="arch-actions">
          {system.caseStudy && (
            <Link className="arch-action is-primary" data-magnetic data-layer="button" data-kind="arch-case-study" href={`/work/${system.caseStudy}`} onClick={() => track("case-study-opened", { from: "architecture", project: system.id })}>
              {copy.caseStudyLabel} <span aria-hidden="true">→</span>
            </Link>
          )}
          <a className="arch-action" data-magnetic data-layer="button" data-kind="arch-source" href={system.href} target="_blank" rel="noreferrer">
            {copy.sourceLabel} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
