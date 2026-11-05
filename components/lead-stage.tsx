"use client";

import { useRef, useState, type ReactNode } from "react";
import type { Demo } from "@/data/case-studies";
import { track } from "@/lib/analytics";

/** The lead picture of a case study, and for projects with a demo, the real product loaded in its place. Nothing loads until it's asked for. */
export function LeadStage({ media, caption, demo, live, project }: { media: ReactNode; caption: string; demo?: Demo; live: string; project: string }) {
  const [started, setStarted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const host = new URL(live).host;

  const start = () => {
    setStarted(true);
    track("demo-started", { project });
  };
  const fullscreen = () => { void stage.current?.requestFullscreen?.().catch(() => undefined); };

  return (
    <figure className="cs-figure">
      <div className={`cs-lead-stage${started ? " is-live" : ""}`} ref={stage}>
        {started && demo ? (
          <>
            {!loaded && <p className="cs-demo-loading" role="status">Loading {host}…</p>}
            <iframe
              src={live}
              title={`${project}, running live`}
              allow="autoplay; fullscreen; gamepad; clipboard-write"
              allowFullScreen
              onLoad={(event) => { setLoaded(true); event.currentTarget.focus(); }}
            />
          </>
        ) : media}
        {demo && !started && (
          <button className={`cs-demo-go${demo.needsKeyboard ? " needs-keyboard" : ""}`} type="button" onClick={start}>
            <i aria-hidden="true" />
            <span>{demo.label}</span>
          </button>
        )}
      </div>
      {demo && started && (
        <div className="cs-demo-bar cs-wrap">
          <span className="cs-label"><i aria-hidden="true" />Live · {host}</span>
          <span className="cs-demo-actions">
            {document.fullscreenEnabled && <button type="button" onClick={fullscreen}>Full screen</button>}
            <a href={live} target="_blank" rel="noreferrer">New tab <span aria-hidden="true">↗</span></a>
            <button type="button" onClick={() => { setStarted(false); setLoaded(false); }}>Close</button>
          </span>
        </div>
      )}
      <figcaption>
        {demo ? <><span className="cs-demo-note">{demo.note}</span><span className="cs-demo-touch-note">{demo.touchNote}</span></> : caption}
      </figcaption>
    </figure>
  );
}
