"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { portfolioContent } from "@/data/content";

const ShowreelModal = dynamic(() => import("@/components/showreel-modal").then((module) => module.ShowreelModal), { ssr: false });
const { contact, hero } = portfolioContent;

/** The way into the films from the middle of the page, built like the next-case-study band. */
export function ReelBand() {
  const [open, setOpen] = useState(false);
  return (
    <section className="reel-band" id="reel" data-scene="reel" aria-label={contact.modalLabel}>
      <button className="showreel-card" data-cursor-label="PLAY" type="button" onClick={() => setOpen(true)} aria-label={contact.modalLabel}>
        <span className="showreel-inner section-shell container-x">
          <span className="showreel-copy">
            <span className="ed-label" data-layer="text">{contact.reelKicker}</span>
            <strong data-layer="text" data-kind="reel-title">{contact.reelTitle}</strong>
            <span className="showreel-meta" data-layer="text">{contact.reelMeta}</span>
          </span>
          <span className="showreel-art" data-layer="image" data-kind="reel-art">
            <span className="showreel-frame"><Image src={hero.reels[0].thumb} alt="" fill sizes="(max-width: 960px) 90vw, (max-width: 1640px) 35vw, 570px" /></span>
            <span className="showreel-go" aria-hidden="true"><i /></span>
          </span>
        </span>
      </button>
      {open && <ShowreelModal onClose={() => setOpen(false)} />}
    </section>
  );
}
