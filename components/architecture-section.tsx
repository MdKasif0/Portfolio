"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { EdFold } from "@/components/ed-fold";
import { MachineFigure } from "@/components/machines/machine-figure";
import { TransitionLink } from "@/components/transition-link";
import { SectionHeader } from "@/components/section-header";
import { portfolioContent } from "@/data/content";
import { systems } from "@/data/systems";
import { track } from "@/lib/analytics";

const copy = portfolioContent.architecture;

export function ArchitectureSection() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const system = systems[active];

  const choose = (index: number) => {
    setActive(index);
    track("architecture-tab", { system: systems[index].id });
    // On small screens the tabs scroll sideways, and a long name can start half hidden.
    const tab = tabs.current[index];
    const strip = tab?.parentElement;
    if (tab && strip && strip.scrollWidth > strip.clientWidth) {
      strip.scrollTo({ left: tab.offsetLeft, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
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
        <MachineFigure machine={system.machine} name={system.name} label={`Fig. ${active + 1}`} />

        <dl className="arch-numbers">
          {system.facts.map((fact) => (
            <div key={fact.label} data-layer="card" data-kind="arch-fact">
              <dt data-layer="text">{fact.label}</dt>
              <dd className="arch-number" data-layer="text">{fact.value}</dd>
              <dd className={`arch-source${fact.source === "Measured" ? " is-measured" : ""}`} data-layer="text">{fact.source}</dd>
            </div>
          ))}
        </dl>

        <EdFold label={copy.tradeOffsLabel} className="arch-fold">
        <ol className="arch-calls">
          {system.tradeOffs.map((item) => (
            <li key={item.chose} data-layer="card" data-kind="arch-tradeoff">
              <div>
                <h4 data-layer="text">{item.chose}</h4>
                <p data-layer="text">Instead of {item.over.charAt(0).toLowerCase() + item.over.slice(1)}</p>
              </div>
              <p data-layer="text">{item.why}</p>
              <p className="arch-cost" data-layer="text"><span>Trade-off</span> {item.cost}</p>
            </li>
          ))}
        </ol>
        </EdFold>

        <div className="arch-actions">
          {system.caseStudy && (
            <TransitionLink className="arch-action is-primary" data-magnetic data-layer="button" data-kind="arch-case-study" href={`/work/${system.caseStudy}`} onClick={() => track("case-study-opened", { from: "architecture", project: system.id })}>
              {copy.caseStudyLabel} <span aria-hidden="true">→</span>
            </TransitionLink>
          )}
          <a className="arch-action" data-magnetic data-layer="button" data-kind="arch-source" href={system.href} target="_blank" rel="noreferrer">
            {copy.sourceLabel} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
