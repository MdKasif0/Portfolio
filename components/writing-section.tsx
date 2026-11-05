import { portfolioContent } from "@/data/content";
import { SectionHeader } from "@/components/section-header";

const copy = portfolioContent.writing;

/** Building in public on X. Posts are real ones listed in content.ts; with none listed it shows the profile card alone. */
export function WritingSection() {
  return (
    <section className="writing-section section-shell container-x" id="writing" data-scene="writing" aria-labelledby="writing-heading">
      <SectionHeader label={copy.eyebrow} titleLines={[...copy.titleLines]} id="writing-heading" titleClassName="writing-title" />
      <div className={`writing-grid${copy.posts.length ? " has-posts" : ""}`}>
        <a className="writing-profile" href={copy.profileHref} target="_blank" rel="noreferrer" data-layer="card" data-kind="writing-profile">
          <span className="writing-handle" data-layer="text">{copy.handle}</span>
          <strong data-layer="text">{copy.followers}</strong>
          <span className="writing-followers" data-layer="text">{copy.followersLabel}</span>
          <p data-layer="text">{copy.intro}</p>
          <span className="writing-cta" data-layer="text">{copy.cta} <i aria-hidden="true">↗</i></span>
        </a>
        {copy.posts.map((post) => (
          <a className="writing-post" href={post.href} key={post.href} target="_blank" rel="noreferrer" data-layer="card" data-kind="writing-post">
            <span className="writing-date" data-layer="text">{post.date}</span>
            <p data-layer="text">{post.text}</p>
            <span className="writing-cta" data-layer="text">{copy.readLabel} <i aria-hidden="true">↗</i></span>
          </a>
        ))}
      </div>
    </section>
  );
}
