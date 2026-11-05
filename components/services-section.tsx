"use client";

import Link from "next/link";
import { SectionHeader } from "@/components/section-header";
import { portfolioContent } from "@/data/content";
import { track } from "@/lib/analytics";

const copy = portfolioContent.services;

/** Picks the offer in the contact form and takes the visitor to it. */
export function chooseOffer(title: string) {
  window.dispatchEvent(new CustomEvent("contact:offer", { detail: title }));
  track("offer-chosen", { offer: title });
}

export function ServicesSection() {
  return (
    <section className="ed-section section-shell container-x" id="services" data-scene="services" aria-labelledby="services-heading">
      <SectionHeader index={copy.eyebrow.slice(0, 2)} label={copy.eyebrow.slice(5)} titleLines={[...copy.titleLines]} id="services-heading" />
      <p className="ed-summary" data-layer="text">{copy.intro}</p>

      <ol className="ed-rows ed-offers">
        {copy.offers.map((offer) => {
          const internal = offer.proofHref.startsWith("/");
          return (
            <li className="ed-offer" data-layer="line" data-kind="offer-row" key={offer.id}>
              <div className="ed-offer-main">
                <h3 data-layer="text">{offer.title}</h3>
                <p data-layer="text">{offer.summary}</p>
              </div>
              <ul className="ed-offer-list">
                {offer.includes.map((item) => <li data-layer="text" data-kind="offer-item" key={item}>{item}</li>)}
              </ul>
              <div className="ed-offer-side">
                <p className="ed-offer-time">
                  <span className="ed-label" data-layer="text">{copy.timelineLabel}</span>
                  <strong data-layer="text" data-kind="offer-timeline">{offer.timeline}</strong>
                </p>
                <p className="ed-links">
                  <a data-layer="text" data-kind="offer-start" href="#contact" onClick={() => chooseOffer(offer.title)}>{copy.startLabel} <span aria-hidden="true">↓</span></a>
                  {internal
                    ? <Link data-layer="text" data-kind="offer-proof" href={offer.proofHref}>{copy.proofLabel}: {offer.proof} <span aria-hidden="true">→</span></Link>
                    : <a data-layer="text" data-kind="offer-proof" href={offer.proofHref} target="_blank" rel="noreferrer">{copy.proofLabel}: {offer.proof} <span aria-hidden="true">↗</span></a>}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="cs-footnote ed-note" data-layer="text">{copy.note}</p>
    </section>
  );
}
