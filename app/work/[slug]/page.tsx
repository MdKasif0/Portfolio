import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseStudyMedia } from "@/components/case-study-media";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { caseStudies, caseStudyFor, type Media } from "@/data/case-studies";
import { portfolioContent } from "@/data/content";
import { nodeKindLabels, type Diagram } from "@/data/systems";

type Props = { params: { slug: string } };

export const dynamicParams = false;
export const generateStaticParams = () => caseStudies.map(({ slug }) => ({ slug }));

export function generateMetadata({ params }: Props): Metadata {
  const study = caseStudyFor(params.slug);
  if (!study) return {};
  const title = `${study.title}: case study`;
  return {
    title,
    description: study.description,
    alternates: { canonical: `/work/${study.slug}` },
    openGraph: { type: "article", url: `/work/${study.slug}`, siteName: "KASIF", title, description: study.description, images: [{ url: study.cover, alt: study.coverAlt }] },
    twitter: { card: "summary_large_image", site: "@md_kasif_uddin", creator: "@md_kasif_uddin", title, description: study.description, images: [{ url: study.cover, alt: study.coverAlt }] }
  };
}

function Figure({ media, number, priority }: { media: Media; number?: number; priority?: boolean }) {
  return (
    <figure className="cs-figure">
      <CaseStudyMedia media={media} priority={priority} />
      <figcaption>{number ? <span>Fig. {number}</span> : null}{media.caption}</figcaption>
    </figure>
  );
}

/** The request path, drawn as one line through the system. Stacked stops happen side by side. */
function RequestPath({ diagram, label }: { diagram: Diagram; label: string }) {
  return (
    <ol className="cs-path" aria-label={label} style={{ "--cs-stops": diagram.columns.length } as React.CSSProperties}>
      {diagram.columns.map((stop, index) => (
        <li className="cs-stop" key={stop[0].title}>
          <span className="cs-stop-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          {stop.map((node) => (
            <div className={`cs-node is-${node.kind}`} key={node.title}>
              <h3>{node.title}</h3>
              <p>{node.note}</p>
              <span className="cs-node-kind">{nodeKindLabels[node.kind]}</span>
            </div>
          ))}
        </li>
      ))}
    </ol>
  );
}

function SectionHead({ label, title }: { label: string; title: string }) {
  return (
    <header className="cs-head">
      <p className="cs-label">{label}</p>
      <h2>{title}</h2>
    </header>
  );
}

/** Dims comment lines, which is the only highlighting the excerpts need. */
function Code({ code }: { code: string }) {
  return (
    <pre tabIndex={0}><code>{code.split("\n").map((line, index) => (
      <span className={line.trim().startsWith("//") ? "cs-code-comment" : undefined} key={index}>{line}{"\n"}</span>
    ))}</code></pre>
  );
}

export default function CaseStudyPage({ params }: Props) {
  const study = caseStudyFor(params.slug);
  if (!study) notFound();
  const position = caseStudies.indexOf(study);
  const next = caseStudies[(position + 1) % caseStudies.length];
  const origin = portfolioContent.siteUrl.replace(/\/$/, "");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${study.title}: case study`,
    description: study.description,
    image: `${origin}${study.cover}`,
    mainEntityOfPage: `${origin}/work/${study.slug}`,
    author: { "@type": "Person", "@id": `${origin}/#person`, name: portfolioContent.identity.name, url: `${origin}/` },
    about: { "@type": "SoftwareSourceCode", name: study.project, codeRepository: study.github, url: study.live }
  };

  return (
    <>
      <SiteNav base="/" />
      <main className="cs" data-theme={study.theme} id="top">
        <header className="cs-hero cs-wrap">
          <div className="cs-hero-top">
            <Link className="cs-back" href="/#work"><span aria-hidden="true">←</span> All work</Link>
            <span className="cs-label">Case study {String(position + 1).padStart(2, "0")} of {String(caseStudies.length).padStart(2, "0")}</span>
          </div>
          <h1 className={`cs-title${study.title.length > 14 ? " is-long" : ""}`}>{study.title}</h1>
          <div className="cs-intro">
            <dl className="cs-meta">
              <div><dt>Role</dt><dd>{study.role}</dd></div>
              <div><dt>Year</dt><dd>{study.year}</dd></div>
              <div><dt>Built with</dt><dd>{study.stack.join(", ")}</dd></div>
            </dl>
            <div>
              <p className="cs-deck">{study.deck}</p>
              <p className="cs-links">
                <a href={study.live} target="_blank" rel="noreferrer">See it live <span aria-hidden="true">↗</span></a>
                <a href={study.github} target="_blank" rel="noreferrer">Read the source <span aria-hidden="true">↗</span></a>
              </p>
            </div>
          </div>
        </header>

        <div className="cs-lead"><Figure media={study.lead} priority /></div>

        <div className="cs-wrap">
          <section className="cs-numbers" aria-label="Key numbers">
            <dl>
              {study.facts.map((fact) => (
                <div key={fact.label}>
                  <dd>{fact.value}</dd>
                  <dt>{fact.label}</dt>
                  <span>{fact.source}</span>
                </div>
              ))}
            </dl>
            <p className="cs-footnote">{study.factsNote}</p>
          </section>

          <section className="cs-section cs-section-problem">
            <SectionHead label="The problem" title={study.problemHeadline} />
            <div className="cs-prose">{study.problem.map((text) => <p key={text}>{text}</p>)}</div>
          </section>

          <section className="cs-section">
            <SectionHead label="The architecture" title={study.architectureHeadline} />
            <RequestPath diagram={study.diagram} label={`${study.title} architecture`} />
            <p className="cs-footnote">{study.diagramNote}</p>
          </section>
        </div>

        <div className={`cs-figures cs-wrap count-${study.figures.length}`}>
          {study.figures.map((media, index) => <Figure media={media} number={index + 1} key={media.src} />)}
        </div>

        <div className="cs-wrap">
          <section className="cs-section">
            <SectionHead label="The decisions" title={study.decisionsHeadline} />
            <ol className="cs-decisions">
              {study.decisions.map((item, index) => (
                <li key={item.chose}>
                  <span className="cs-label" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <div className="cs-decision-call">
                    <h3>{item.chose}</h3>
                    <p>Instead of {item.over.charAt(0).toLowerCase() + item.over.slice(1)}</p>
                  </div>
                  <div className="cs-decision-why">
                    <p>{item.why}</p>
                    <p className="cs-tradeoff"><span>Trade-off</span> {item.cost}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="cs-excerpt" aria-label="Code excerpt">
            <a className="cs-excerpt-file" href={study.excerpt.href} target="_blank" rel="noreferrer">{study.excerpt.file} <span aria-hidden="true">↗</span></a>
            <Code code={study.excerpt.code} />
            <p className="cs-footnote">{study.excerpt.note}</p>
          </section>

          <section className="cs-section">
            <SectionHead label="The failures" title={study.wrongHeadline} />
            <ol className="cs-log">
              {study.wrong.map((item) => (
                <li key={item.title}>
                  <time>{item.date}</time>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.what}</p>
                  </div>
                  <p className="cs-log-fix">{item.fix}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="cs-section cs-outcome">
            <div>
              <p className="cs-label">Where it stands</p>
              <ul>{study.results.map((text) => <li key={text}>{text}</li>)}</ul>
            </div>
            <div>
              <p className="cs-label">What I&apos;d do next</p>
              <ul>{study.next.map((text) => <li key={text}>{text}</li>)}</ul>
            </div>
          </section>
        </div>

        <nav className="cs-end" data-next={next.theme} aria-label="More case studies">
          <Link className="cs-next-link" href={`/work/${next.slug}`}>
            <span className="cs-label">Next case study</span>
            <strong>{next.title}</strong>
            <i aria-hidden="true">→</i>
          </Link>
          <p className="cs-end-note cs-wrap">Have something similar to build? <Link href="/#contact">Let&apos;s talk <span aria-hidden="true">→</span></Link></p>
        </nav>
      </main>
      <SiteFooter base="/" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </>
  );
}
