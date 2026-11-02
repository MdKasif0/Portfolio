"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { portfolioContent } from "@/data/content";
import { ShowreelModal } from "@/components/showreel-modal";
import { useAgentBuild } from "@/components/agent-build/BuildProvider";
import { SectionHeader } from "@/components/section-header";

type IconName = typeof portfolioContent.contact.socials[number]["icon"] | typeof portfolioContent.footer.socialLinks[number]["icon"] | "email" | "coffee";

function ContactIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    x: <path d="M4 3h2.5l5.5 10h-2.5L4 3Zm0 10 4-4m3-6L7 7" />,
    instagram: <><rect x="2.5" y="2.5" width="11" height="11" rx="3" /><circle cx="8" cy="8" r="2.5" /><circle cx="11.5" cy="4.7" r=".6" fill="currentColor" stroke="none" /></>,
    github: <><path d="M8 2.5a5.5 5.5 0 0 0-1.74 10.72c.28.05.38-.12.38-.27v-.96c-1.55.34-1.88-.66-1.88-.66-.25-.65-.62-.82-.62-.82-.51-.35.04-.34.04-.34.56.04.86.57.86.57.5.86 1.31.61 1.63.47.05-.36.2-.61.36-.75-1.24-.14-2.55-.62-2.55-2.77 0-.61.22-1.11.57-1.5-.06-.14-.25-.71.05-1.48 0 0 .47-.15 1.51.57a5.2 5.2 0 0 1 2.75 0c1.05-.72 1.51-.57 1.51-.57.3.77.11 1.34.06 1.48.35.39.56.89.56 1.5 0 2.16-1.31 2.63-2.56 2.77.2.17.38.51.38 1.03v1.46c0 .15.1.33.38.27A5.5 5.5 0 0 0 8 2.5Z" /></>,
    email: <><rect x="2" y="3.5" width="12" height="9" rx="1" /><path d="m2.5 4 5.5 4.5L13.5 4" /></>,
    coffee: <><path d="M3 5.5h8v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-4Zm8 1h1.5a1.5 1.5 0 0 1 0 3H11M4 3.5v-1m3 1v-1m3 1v-1" /><path d="M2.5 14h10" /></>
  };

  return <svg viewBox="0 0 16 16" aria-hidden="true">{paths[name]}</svg>;
}

export function ContactSection() {
  const [reelOpen, setReelOpen] = useState(false);
  const [copied, setCopied] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [indiaTime, setIndiaTime] = useState("");
  const contact = portfolioContent.contact;

  useEffect(() => {
    const update = () => setIndiaTime(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()));
    update(); const timer = window.setInterval(update, 30_000); return () => window.clearInterval(timer);
  }, []);
  const copyHandle = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(value); window.setTimeout(() => setCopied(""), 1800); } catch { /* clipboard can be unavailable in embedded previews */ }
  };
  const submitProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    setSubmitted(true);
  };

  return (
    <>
      <section className="contact-section section-shell container-x" id="contact" data-scene="contact" aria-labelledby="contact-heading">
        <SectionHeader
          index={contact.eyebrow.slice(0, 2)}
          label={contact.eyebrow.slice(5)}
          titleLines={[`${contact.title}.`]}
          id="contact-heading"
          titleClassName="contact-heading"
        />

        <div className="contact-grid">
          <div className="contact-intro">
            <p data-layer="text">{contact.introduction}</p>
            <a className="contact-cta magnetic-cta" data-layer="button" href={contact.socials[0].href} target="_blank" rel="noreferrer">
              {contact.cta}<span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="contact-details" role="group" aria-label="Contact details">
            {contact.email && <div className="contact-row" data-layer="line" id="contact-email">
              <span className="contact-icon" data-layer="icon"><ContactIcon name="email" /></span>
              <span className="contact-label" data-layer="text">{contact.emailLabel}</span>
              <span className="contact-value" data-layer="text">{contact.email}</span>
            </div>}
            {contact.socials.map((item) => (
              <button className={`contact-row${copied === item.value ? " is-copied" : ""}`} data-layer="line" data-kind="contact-row" type="button" onClick={() => copyHandle(item.value)} key={item.label} aria-label={`Copy ${item.label} handle`}>
                <span className="contact-icon" data-layer="icon"><ContactIcon name={item.icon} /></span>
                <span className="contact-label" data-layer="text">{item.label}</span>
                <span className="contact-value" data-layer="text">{item.value}</span>
                <span className="contact-arrow" data-layer="icon" aria-hidden="true">{copied === item.value ? "✓" : "↗"}</span>
              </button>
            ))}
            <div className="contact-row">
              <span className="contact-icon contact-pin" data-layer="icon" aria-hidden="true">⌖</span>
              <span className="contact-label" data-layer="text">{contact.locationLabel}</span>
              <span className="contact-value" data-layer="text">{contact.location}</span>
            </div>
          </div>

          <form className={`project-form${submitted ? " is-submitted" : ""}`} name="project-inquiry" method="POST" data-netlify="true" data-netlify-honeypot="bot-field" onSubmit={submitProject} data-layer="card" data-kind="project-form">
            <input type="hidden" name="form-name" value="project-inquiry" />
            <p className="form-honeypot"><label>Don&apos;t fill this out <input name="bot-field" /></label></p>
            {submitted ? <div className="form-success" role="status"><b>✓</b><span>MESSAGE READY TO SHIP</span><button type="button" onClick={() => setSubmitted(false)}>SEND ANOTHER</button></div> : <>
              <div className="form-heading"><span>START A PROJECT</span><span className="india-time">IST · {indiaTime || "--:--"}</span></div>
              <label>Name<input required name="name" placeholder="Your name" data-layer="button" data-kind="form-field" /></label>
              <label>Email<input required name="email" type="email" placeholder="you@company.com" data-layer="button" data-kind="form-field" /></label>
              <label>Budget<select required name="budget" defaultValue="" data-layer="button" data-kind="form-select"><option value="" disabled>Select a range</option><option>Under $1k</option><option>$1k — $3k</option><option>$3k+</option></select></label>
              <label>Message<textarea required name="message" rows={3} placeholder="What are we building?" data-layer="button" data-kind="form-field" /></label>
              <button className="form-submit" type="submit" data-layer="button" data-kind="form-submit">SEND PROJECT <span>↗</span></button>
            </>}
          </form>

          <button className="showreel-card" data-layer="card" type="button" onClick={() => setReelOpen(true)} aria-label={contact.modalLabel}>
            <span className="showreel-kicker" data-layer="text">{contact.cardKicker}</span>
            <span className="showreel-title" data-layer="text">{contact.cardTitleWhite}<br /><i>{contact.cardTitleRed}<b>.</b></i></span>
            <span className="showreel-play" data-layer="icon" aria-hidden="true"><span /></span>
            <span className="showreel-card-caption" data-layer="text">{contact.modalLabel}<span aria-hidden="true">↗</span></span>
          </button>
        </div>
      </section>
      {reelOpen && <ShowreelModal onClose={() => setReelOpen(false)} />}
    </>
  );
}

export function SiteFooter() {
  const footer = portfolioContent.footer;
  const { replayBuild } = useAgentBuild();

  return (
    <footer className="site-footer section-shell container-x" data-scene="footer">
      <a className="footer-wordmark" data-layer="text" data-kind="footer-wordmark" href="#top" aria-label="Kasif, back to top">
        KASIF<span className="title-period">.</span>
      </a>
      <p className="footer-project-prompt" data-layer="text">{footer.projectPrompt}<span aria-hidden="true"> ↗</span></p>
      <button className="footer-replay-build" data-layer="button" type="button" onClick={replayBuild}>Replay build <span aria-hidden="true">▶</span></button>
      <nav className="footer-socials" aria-label="Social links">
        {footer.socialLinks.map((item) => (
          <a
            href={item.href || "#contact"}
            data-layer="button"
            target={item.href ? "_blank" : undefined}
            rel={item.href ? "noreferrer" : undefined}
            aria-label={item.label}
            key={item.label}
          >
            <ContactIcon name={item.icon} />
          </a>
        ))}
      </nav>
      <p className="footer-copyright" data-layer="text">© {new Date().getFullYear()} {portfolioContent.identity.name}{footer.note ? ` · ${footer.note}` : ""}</p>
    </footer>
  );
}
