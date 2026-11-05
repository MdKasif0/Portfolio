import { EdFold } from "@/components/ed-fold";
import { SectionHeader } from "@/components/section-header";
import { SignatureMark } from "@/components/signature-mark";
import { portfolioContent } from "@/data/content";

const about = portfolioContent.about;
const journey = portfolioContent.journey;

export function AboutSection() {
  const [lead, ...bio] = about.bioLines;
  return (
    <section className="ed-section section-shell container-x" id="about" data-scene="about" aria-labelledby="about-heading">
      <SectionHeader
        index={about.eyebrow.slice(0, 2)}
        label={about.eyebrow.slice(5)}
        titleLines={[`${about.titleBefore}.`, `${about.titleAfter}.`]}
        accentLastLine
        id="about-heading"
      />

      <div className="ed-intro">
        <p className="ed-lead" data-layer="text" data-kind="about-lead">{lead}</p>
        <div className="ed-intro-side">
          {bio.map((line) => <p data-layer="text" data-kind="about-bio-line" key={line}>{line}</p>)}
          <p className="ed-fact">
            <span className="ed-label" data-layer="text">{about.educationLabel}</span>
            <span data-layer="text">{about.educationDegree}, {about.educationSchool}. {about.educationStatus}.</span>
          </p>
        </div>
      </div>

      <EdFold label={about.toolkitLabel}>
        <dl className="ed-table">
          {about.toolkitGroups.map((group) => (
            <div className="ed-table-row" data-layer="line" data-kind="stack-row" key={group.label}>
              <dt data-layer="text">{group.label}</dt>
              <dd data-layer="text">{group.skills.join(", ")}</dd>
            </div>
          ))}
        </dl>
      </EdFold>

      <EdFold label={about.processLabel}>
        <ol className="ed-steps">
          {about.process.map((step, index) => (
            <li data-layer="line" data-kind="process-step" key={step.title}>
              <span className="ed-label" data-layer="text">{String(index + 1).padStart(2, "0")}</span>
              <h4 data-layer="text">{step.title}</h4>
              <p data-layer="text">{step.description}</p>
            </li>
          ))}
        </ol>
      </EdFold>

      <figure className="ed-pull">
        <blockquote data-layer="text" data-kind="about-quote">{about.quote}</blockquote>
        <figcaption>
          <SignatureMark />
          <span className="ed-label" data-layer="text">{about.quoteFooter}</span>
        </figcaption>
      </figure>
    </section>
  );
}

export function JourneySection() {
  return (
    <section className="ed-section section-shell container-x" id="journey" data-scene="journey" aria-labelledby="journey-heading">
      <SectionHeader
        index={journey.eyebrow.slice(0, 2)}
        label={journey.eyebrow.slice(5)}
        titleLines={["KEEP MOVING.", "KEEP BUILDING."]}
        accentLastLine
        id="journey-heading"
      />

      <div className="ed-two">
        <div>
          <h3 className="ed-label ed-col-label" data-layer="text">{journey.experienceLabel}</h3>
          <article className="ed-now">
            <p className="ed-now-top">
              <span className="ed-now-tag" data-layer="text" data-kind="journey-now"><i aria-hidden="true" />{journey.nowLabel}</span>
              <span className="ed-label" data-layer="text">{journey.activePeriod}</span>
            </p>
            <h4 data-layer="text">{journey.activeRole}</h4>
            <ul>
              {journey.activePoints.map((point) => <li data-layer="text" data-kind="journey-point" key={point}>{point}</li>)}
            </ul>
          </article>
          <ol className="ed-rows">
            {journey.roles.map((role) => (
              <li className="ed-role" data-layer="line" data-kind="journey-role" key={role.title}>
                <span className="ed-label" data-layer="text">{role.period}</span>
                <div>
                  <h4 data-layer="text">{role.title}</h4>
                  <p data-layer="text">{role.subtitle}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h3 className="ed-label ed-col-label" data-layer="text">{journey.milestonesLabel}</h3>
          <ol className="ed-rows">
            {journey.milestones.map((milestone) => {
              const internal = milestone.href.startsWith("#");
              return (
                <li key={milestone.title}>
                  <a className="ed-mile" data-layer="line" data-kind="milestone-row" href={milestone.href} {...(internal ? {} : { target: "_blank", rel: "noreferrer" })}>
                    <span className="ed-mile-year" data-layer="text">{milestone.year}</span>
                    <span data-layer="text">{milestone.title}</span>
                    <i aria-hidden="true">{internal ? "↓" : "↗"}</i>
                  </a>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
