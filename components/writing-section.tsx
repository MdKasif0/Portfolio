import Image from "next/image";
import Link from "next/link";
import { GithubProof } from "@/components/github-proof";
import { SectionHeader } from "@/components/section-header";
import { portfolioContent } from "@/data/content";
import { notes } from "@/data/notes";

const copy = portfolioContent.writing;

/** The public record: the code on GitHub, the posts on X and the engineering notes on this site. */
export function WritingSection() {
  return (
    <section className="ed-section section-shell container-x" id="writing" data-scene="writing" aria-labelledby="writing-heading">
      <SectionHeader label={copy.eyebrow} titleLines={[...copy.titleLines]} id="writing-heading" />
      <p className="ed-summary" data-layer="text">{copy.intro}</p>

      <GithubProof />

      <div className="ed-open-block">
        <div className="ed-open-head">
          <h3 className="ed-label" data-layer="text">{copy.postsLabel}</h3>
          <p className="ed-open-profile ed-label">
            <strong data-layer="text">{copy.followers}</strong>
            <span data-layer="text">{copy.followersLabel}, {copy.handle}</span>
          </p>
          <a href={copy.profileHref} target="_blank" rel="noreferrer" data-layer="text" data-kind="writing-follow">{copy.cta} <i aria-hidden="true">↗</i></a>
        </div>
        <ul className="ed-posts">
          {copy.posts.map((post) => (
            <li key={post.href}>
              <a className="ed-post" href={post.href} target="_blank" rel="noreferrer" data-layer="line" data-kind="writing-post">
                <span className="ed-post-image" data-layer="image" data-kind="post-image"><Image src={post.image} alt="" fill unoptimized referrerPolicy="no-referrer" sizes="(max-width: 700px) 92px, (max-width: 1640px) 28vw, 460px" /></span>
                <span className="ed-label" data-layer="text">{post.date}</span>
                <p data-layer="text">{post.text}</p>
                <span className="ed-post-foot" data-layer="text"><span>{post.likes} likes · {post.replies} replies</span><b>{copy.readLabel} ↗</b></span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="ed-open-block">
        <div className="ed-open-head">
          <h3 className="ed-label" data-layer="text">{copy.notesLabel}</h3>
          <Link href="/notes" data-layer="text" data-kind="notes-all">{copy.notesCta} <i aria-hidden="true">→</i></Link>
        </div>
        <ol className="ed-note-list" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {notes.map((note) => (
            <li key={note.slug}>
              <Link className="ed-note-row" href={`/notes/${note.slug}`} data-layer="line" data-kind="note-row">
                <span className="ed-label" data-layer="text">{note.dateLabel}</span>
                <strong data-layer="text">{note.title}</strong>
                <span className="ed-label" data-layer="text">{note.project}</span>
                <i aria-hidden="true">→</i>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
