import { portfolioContent } from "@/data/content";

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
  const marqueeNames = [...collaborators.names, ...collaborators.names];

  return (
    <section className="collab-strip section-shell" data-build-section="collaborators" data-scene="collaborators" aria-label="Collaborations">
      <div className="collab-strip-label">
        <span data-layer="text">{collaborators.label}</span>
        <strong data-layer="text">{collaborators.title}</strong>
      </div>
      <div className="collab-marquee">
        <div className="collab-marquee-track">
          {marqueeNames.map((name, index) => (
            <span className={`collab-wordmark wordmark-${index % collaborators.names.length}`} data-layer="text" key={`${name}-${index}`}>{name}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RecognitionSection() {
  return (
    <section className="recognition-section section-shell" id="recognition" data-scene="recognition" aria-labelledby="recognition-heading">
      <div className="recognition-intro">
        <p className="eyebrow" data-layer="text">{recognition.eyebrow}</p>
        <h2 className="display-title recognition-heading" data-layer="text" id="recognition-heading">
          <span>{recognition.titleWhite}<i className="title-period recognition-white-period">.</i></span>
          <span className="recognition-red">{recognition.titleRed}<i className="title-period">.</i></span>
        </h2>
        <div className="recognition-count">
          <LaurelWreath />
          <span className="recognition-number" data-layer="text">{recognition.count}</span>
          <span className="recognition-count-label" data-layer="text">{recognition.countLabel}</span>
        </div>
        <p className="recognition-summary" data-layer="text">{recognition.summary}</p>
        <a
          className={`recognition-proof${recognition.proofHref === "[PLACEHOLDER]" ? " is-placeholder" : ""}`}
          data-layer="button"
          href={recognition.proofHref === "[PLACEHOLDER]" ? undefined : recognition.proofHref}
          aria-disabled={recognition.proofHref === "[PLACEHOLDER]"}
        >
          {recognition.proofLabel} <span aria-hidden="true">↗</span>
        </a>
      </div>

      <div className="recognition-list">
        <div className="recognition-list-heading">
          <span data-layer="text">{recognition.listLabel}</span>
          <span data-layer="text">{recognition.yearColumn}</span>
        </div>
        <ol>
          {recognition.entries.map((entry, index) => (
            <li className="recognition-row" data-layer="line" key={entry.title}>
              <span className="recognition-row-index" data-layer="text">{String(index + 1).padStart(2, "0")}</span>
              <div className="recognition-row-copy">
                <h3 data-layer="text">{entry.title}</h3>
                <p data-layer="text">{entry.subtitle}</p>
              </div>
              <span className="recognition-year" data-layer="text">{entry.year}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
