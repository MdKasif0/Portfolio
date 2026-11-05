import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { notes } from "@/data/notes";

const title = "Engineering notes";
const description = "Short write-ups of real bugs and bad calls from building GitRoasted, Cookie and Shadow of the Crimson Gate, with the code that caused them.";
const image = { url: "/og/notes.jpg", width: 1200, height: 630, alt: "Engineering notes by Kasif" };

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/notes" },
  openGraph: { type: "website", url: "/notes", siteName: "KASIF", title, description, images: [image] },
  twitter: { card: "summary_large_image", site: "@md_kasif_uddin", creator: "@md_kasif_uddin", title, description, images: [image] }
};

export default function NotesPage() {
  return (
    <>
      <SiteNav base="/" />
      <main className="cs" data-theme="brand" id="top">
        <header className="cs-hero cs-wrap">
          <div className="cs-hero-top">
            <Link className="cs-back" href="/#writing"><span aria-hidden="true">←</span> Back to the site</Link>
            <span className="cs-label">{notes.length} notes</span>
          </div>
          <h1 className="cs-title is-long">Engineering notes</h1>
          <p className="cs-deck note-index-deck">Real bugs and bad calls from things I shipped, with the code that caused them. Nothing here worked the first time.</p>
        </header>
        <div className="cs-wrap note-index">
          <h2 className="sr-only">All notes</h2>
          <ol className="ed-rows">
            {notes.map((note) => (
              <li key={note.slug}>
                <Link className="note-index-row" href={`/notes/${note.slug}`}>
                  <span className="cs-label">{note.dateLabel}</span>
                  <span className="note-index-copy">
                    <strong>{note.title}</strong>
                    <span>{note.deck}</span>
                  </span>
                  <span className="cs-label note-index-project">{note.project}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </main>
      <SiteFooter base="/" />
    </>
  );
}
