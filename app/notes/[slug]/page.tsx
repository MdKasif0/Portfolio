import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { portfolioContent } from "@/data/content";
import { noteFor, notes } from "@/data/notes";

type Props = { params: { slug: string } };

export const dynamicParams = false;
export const generateStaticParams = () => notes.map(({ slug }) => ({ slug }));

export function generateMetadata({ params }: Props): Metadata {
  const note = noteFor(params.slug);
  if (!note) return {};
  const image = { url: `/og/note-${note.slug}.jpg`, width: 1200, height: 630, alt: note.title };
  return {
    title: note.title,
    description: note.description,
    alternates: { canonical: `/notes/${note.slug}` },
    openGraph: { type: "article", url: `/notes/${note.slug}`, siteName: "KASIF", title: note.title, description: note.description, publishedTime: note.date, images: [image] },
    twitter: { card: "summary_large_image", site: "@md_kasif_uddin", creator: "@md_kasif_uddin", title: note.title, description: note.description, images: [image] }
  };
}

export default function NotePage({ params }: Props) {
  const note = noteFor(params.slug);
  if (!note) notFound();
  const position = notes.indexOf(note);
  const next = notes[(position + 1) % notes.length];
  const origin = portfolioContent.siteUrl.replace(/\/$/, "");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: note.title,
    description: note.description,
    datePublished: note.date,
    image: `${origin}/og/note-${note.slug}.jpg`,
    mainEntityOfPage: `${origin}/notes/${note.slug}`,
    author: { "@type": "Person", "@id": `${origin}/#person`, name: portfolioContent.identity.name, url: `${origin}/` }
  };

  return (
    <>
      <SiteNav base="/" />
      <main className="cs" data-theme="brand" id="top">
        <article>
          <header className="cs-hero cs-wrap">
            <div className="cs-hero-top">
              <Link className="cs-back" href="/notes"><span aria-hidden="true">←</span> All notes</Link>
              <span className="cs-label">{note.dateLabel}</span>
            </div>
            <h1 className="note-title">{note.title}</h1>
            <p className="cs-deck note-deck">{note.deck}</p>
            <p className="note-from cs-label">From building <Link href={note.projectHref}>{note.project} <span aria-hidden="true">→</span></Link></p>
          </header>

          <div className="cs-wrap note-body">
            {note.blocks.map((block, index) => {
              if (block.kind === "h") return <h2 key={index}>{block.text}</h2>;
              if (block.kind === "p") return <p key={index}>{block.text}</p>;
              return (
                <figure className="cs-excerpt note-code" key={index}>
                  <figcaption><a className="cs-excerpt-file" href={block.href} target="_blank" rel="noreferrer">{block.file} <span aria-hidden="true">↗</span></a></figcaption>
                  <pre tabIndex={0}><code>{block.code}</code></pre>
                </figure>
              );
            })}
          </div>
        </article>

        <nav className="note-next cs-wrap" aria-label="Next note">
          <span className="cs-label">Next note</span>
          <Link href={`/notes/${next.slug}`}>{next.title} <span aria-hidden="true">→</span></Link>
        </nav>
      </main>
      <SiteFooter base="/" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </>
  );
}
