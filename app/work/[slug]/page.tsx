import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchitectureDiagram, SystemFacts } from "@/components/architecture-diagram";
import { Atmosphere } from "@/components/design-primitives";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { caseStudies, caseStudyFor } from "@/data/case-studies";
import { portfolioContent } from "@/data/content";

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

function Part({ index, title, children }: { index: string; title: string; children: React.ReactNode }) {
  return (
    <section className="cs-part">
      <header className="cs-part-head">
        <span>{index}</span>
        <h2>{title}<b>.</b></h2>
      </header>
      <div className="cs-part-body">{children}</div>
    </section>
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
      <Atmosphere />
      <SiteNav base="/" />
      <main className="cs" id="top">
        <header className="cs-hero container-x">
          <Link className="cs-back" href="/#work"><span aria-hidden="true">←</span> All work</Link>
          <p className="cs-kicker">Case study {String(position + 1).padStart(2, "0")} / {String(caseStudies.length).padStart(2, "0")}</p>
          <h1 className="cs-title">{study.title}<span>.</span></h1>
          <p className="cs-tagline">{study.tagline}</p>
          <dl className="cs-meta">
            <div><dt>Role</dt><dd>{study.role}</dd></div>
            <div><dt>Year</dt><dd>{study.year}</dd></div>
            <div className="cs-meta-stack"><dt>Stack</dt><dd>{study.stack.join(" · ")}</dd></div>
          </dl>
          <div className="arch-actions">
            <a className="arch-action is-primary" href={study.live} target="_blank" rel="noreferrer">See it live <span aria-hidden="true">↗</span></a>
            <a className="arch-action" href={study.github} target="_blank" rel="noreferrer">Read the source <span aria-hidden="true">↗</span></a>
          </div>
          <div className="cs-cover">
            <Image src={study.cover} alt={study.coverAlt} fill priority sizes="(max-width: 1440px) 100vw, 1320px" />
          </div>
        </header>

        <div className="cs-content container-x">
          <div className="cs-facts">
            <SystemFacts facts={study.facts} />
            <p className="cs-note">{study.factsNote}</p>
          </div>

          <Part index="01" title="The problem">
            <div className="cs-prose">{study.problem.map((text) => <p key={text}>{text}</p>)}</div>
          </Part>

          <Part index="02" title="The architecture">
            <ArchitectureDiagram diagram={study.diagram} label={`${study.title} architecture`} />
            <p className="cs-note">{study.diagramNote}</p>
          </Part>

          <Part index="03" title="The decisions">
            <ul className="arch-tradeoffs cs-decisions">
              {study.decisions.map((item) => (
                <li className="arch-tradeoff" key={item.chose}>
                  <strong>{item.chose}</strong>
                  <span className="arch-over">over {item.over.charAt(0).toLowerCase() + item.over.slice(1)}</span>
                  <p>{item.why}</p>
                  <p className="arch-cost"><b>The cost</b> {item.cost}</p>
                </li>
              ))}
            </ul>
          </Part>

          <Part index="04" title="What went wrong">
            <ol className="cs-incidents">
              {study.wrong.map((item) => (
                <li key={item.title}>
                  <span className="cs-incident-date">{item.date}</span>
                  <h3>{item.title}</h3>
                  <p>{item.what}</p>
                  <p className="cs-incident-fix"><b>The fix</b> {item.fix}</p>
                </li>
              ))}
            </ol>
          </Part>

          <Part index="05" title="The results">
            <ul className="cs-list">{study.results.map((text) => <li key={text}>{text}</li>)}</ul>
          </Part>

          <Part index="06" title="What I'd do next">
            <ul className="cs-list">{study.next.map((text) => <li key={text}>{text}</li>)}</ul>
          </Part>
        </div>

        <nav className="cs-next container-x" aria-label="More case studies">
          <Link className="cs-next-card" href={`/work/${next.slug}`}>
            <span>Next case study</span>
            <strong>{next.title}<b>.</b></strong>
            <i aria-hidden="true">→</i>
          </Link>
          <Link className="cs-next-card is-contact" href="/#contact">
            <span>Have something similar to build?</span>
            <strong>Let&apos;s talk<b>.</b></strong>
            <i aria-hidden="true">→</i>
          </Link>
        </nav>
      </main>
      <SiteFooter base="/" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </>
  );
}
