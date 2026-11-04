"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { portfolioContent } from "@/data/content";
import { ShowreelModal } from "@/components/showreel-modal";
import { SectionHeader } from "@/components/section-header";

type IconName = typeof portfolioContent.contact.socials[number]["icon"] | typeof portfolioContent.footer.socialLinks[number]["icon"] | "email" | "coffee";

export function ContactIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    x: <path d="M4 3h2.5l5.5 10h-2.5L4 3Zm0 10 4-4m3-6L7 7" />,
    instagram: <><rect x="2.5" y="2.5" width="11" height="11" rx="3" /><circle cx="8" cy="8" r="2.5" /><circle cx="11.5" cy="4.7" r=".6" fill="currentColor" stroke="none" /></>,
    github: <><path d="M8 2.5a5.5 5.5 0 0 0-1.74 10.72c.28.05.38-.12.38-.27v-.96c-1.55.34-1.88-.66-1.88-.66-.25-.65-.62-.82-.62-.82-.51-.35.04-.34.04-.34.56.04.86.57.86.57.5.86 1.31.61 1.63.47.05-.36.2-.61.36-.75-1.24-.14-2.55-.62-2.55-2.77 0-.61.22-1.11.57-1.5-.06-.14-.25-.71.05-1.48 0 0 .47-.15 1.51.57a5.2 5.2 0 0 1 2.75 0c1.05-.72 1.51-.57 1.51-.57.3.77.11 1.34.06 1.48.35.39.56.89.56 1.5 0 2.16-1.31 2.63-2.56 2.77.2.17.38.51.38 1.03v1.46c0 .15.1.33.38.27A5.5 5.5 0 0 0 8 2.5Z" /></>,
    email: <><rect x="2" y="3.5" width="12" height="9" rx="1" /><path d="m2.5 4 5.5 4.5L13.5 4" /></>,
    coffee: <><path d="M3 5.5h8v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-4Zm8 1h1.5a1.5 1.5 0 0 1 0 3H11M4 3.5v-1m3 1v-1m3 1v-1" /><path d="M2.5 14h10" /></>
  };

  return <svg viewBox="0 0 16 16" aria-hidden="true">{paths[name]}</svg>;
}
const budgets = portfolioContent.contact.budgets;
type FormStatus = "idle" | "sending" | "sent" | "error";

export function ContactSection() {
  const [reelOpen, setReelOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [indiaTime, setIndiaTime] = useState("");
  const { contact, hero } = portfolioContent;

  useEffect(() => {
    const update = () => setIndiaTime(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()));
    update(); const timer = window.setInterval(update, 30_000); return () => window.clearInterval(timer);
  }, []);
  const copyEmail = async () => {
    try { await navigator.clipboard.writeText(contact.email); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* clipboard can be unavailable in embedded previews */ }
  };
  /** Netlify Forms picks up the form from the built HTML; this posts to it without leaving the page. */
  const submitProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setStatus("sending");
    try {
      const body = new URLSearchParams(Array.from(new FormData(form), ([key, value]) => [key, String(value)]));
      const response = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
      if (!response.ok) throw new Error(`Form post failed: ${response.status}`);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      <section className="contact-section section-shell container-x" id="contact" data-scene="contact" aria-labelledby="contact-heading">
        <div className="contact-top">
          <SectionHeader
            index={contact.eyebrow.slice(0, 2)}
            label={contact.eyebrow.slice(5)}
            titleLines={[`${contact.title}.`]}
            id="contact-heading"
            titleClassName="contact-heading"
          />
          <span className="contact-status" data-layer="text" data-kind="contact-status"><i aria-hidden="true" />{hero.availability}</span>
        </div>

        <div className="contact-grid">
          <div className="contact-intro">
            <p className="contact-lead" data-layer="text">{contact.introduction}</p>
            <div className="contact-actions">
              <a className="contact-cta" data-magnetic data-layer="button" data-kind="contact-cta" href={`mailto:${contact.email}`}>{contact.cta}<span aria-hidden="true">↗</span></a>
              <button className={`contact-copy${copied ? " is-copied" : ""}`} data-layer="button" data-kind="contact-copy" type="button" onClick={copyEmail}>{copied ? "COPIED ✓" : "COPY EMAIL"}</button>
            </div>
            <ul className="contact-details" aria-label="Contact details">
              <li>
                <a className="contact-row" id="contact-email" data-layer="line" data-kind="contact-row" href={`mailto:${contact.email}`}>
                  <span className="contact-icon" data-layer="icon"><ContactIcon name="email" /></span>
                  <span className="contact-label" data-layer="text">{contact.emailLabel}</span>
                  <span className="contact-value" data-layer="text">{contact.email}</span>
                  <span className="contact-arrow" data-layer="icon" aria-hidden="true">↗</span>
                </a>
              </li>
              {contact.socials.map((item) => (
                <li key={item.label}>
                  <a className="contact-row" data-layer="line" data-kind="contact-row" href={item.href} target="_blank" rel="noreferrer">
                    <span className="contact-icon" data-layer="icon"><ContactIcon name={item.icon} /></span>
                    <span className="contact-label" data-layer="text">{item.label}</span>
                    <span className="contact-value" data-layer="text">{item.value}</span>
                    <span className="contact-arrow" data-layer="icon" aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="contact-locale" data-layer="text" data-kind="contact-locale">
              <span>{contact.locationLabel} {contact.location}</span>
              <span className="india-time">IST · {indiaTime || "--:--"}</span>
            </p>
          </div>

          <form className="project-form" name="project-inquiry" method="POST" data-netlify="true" data-netlify-honeypot="bot-field" onSubmit={submitProject} data-layer="card" data-kind="project-form">
            <input type="hidden" name="form-name" value="project-inquiry" />
            <p className="form-honeypot"><label>Don&apos;t fill this out <input name="bot-field" tabIndex={-1} autoComplete="off" /></label></p>
            {status === "sent" ? (
              <div className="form-success" role="status">
                <b aria-hidden="true">✓</b>
                <strong>{contact.formSentTitle}</strong>
                <span>{contact.formSentBody}</span>
                <button type="button" onClick={() => setStatus("idle")}>{contact.formSendAnother}</button>
              </div>
            ) : (
              <>
                <div className="form-heading">
                  <h3 data-layer="text">{contact.formTitle}</h3>
                  <p data-layer="text">{contact.formSubtitle}</p>
                </div>
                <label className="form-control"><span>Name</span><input required name="name" autoComplete="name" placeholder="Your name" data-layer="button" data-kind="form-field" /></label>
                <label className="form-control"><span>Email</span><input required name="email" type="email" autoComplete="email" placeholder="you@company.com" data-layer="button" data-kind="form-field" /></label>
                <fieldset className="form-budget">
                  <legend>Budget</legend>
                  <div>
                    {budgets.map((budget) => (
                      <label className="form-budget-option" data-layer="button" data-kind="form-budget" key={budget}>
                        <input required type="radio" name="budget" value={budget} />
                        <span>{budget}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="form-control form-control-wide"><span>Message</span><textarea required name="message" rows={4} placeholder="What are we building?" data-layer="button" data-kind="form-field" /></label>
                <button className="form-submit" data-magnetic type="submit" disabled={status === "sending"} data-layer="button" data-kind="form-submit">{status === "sending" ? contact.formSending : contact.formSubmit} <span aria-hidden="true">↗</span></button>
                {status === "error" && <p className="form-error" role="alert">{contact.formError} <a href={`mailto:${contact.email}`}>{contact.email}</a></p>}
              </>
            )}
          </form>
        </div>

        <button className="showreel-card" data-cursor-label="PLAY" data-layer="card" data-kind="showreel-card" type="button" onClick={() => setReelOpen(true)} aria-label={contact.modalLabel}>
          <span className="showreel-copy">
            <span className="showreel-kicker" data-layer="text">{contact.cardKicker}</span>
            <span className="showreel-title" data-layer="text">{contact.cardTitleWhite} <i>{contact.cardTitleRed}<b>.</b></i></span>
          </span>
          <span className="showreel-action">
            <span className="showreel-card-caption" data-layer="text">{contact.modalLabel}</span>
            <span className="showreel-play" data-layer="icon" aria-hidden="true"><span /></span>
          </span>
        </button>
      </section>
      {reelOpen && <ShowreelModal onClose={() => setReelOpen(false)} />}
    </>
  );
}
