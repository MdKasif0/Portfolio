"use client";

import { useEffect, useState, type FormEvent } from "react";
import { portfolioContent } from "@/data/content";
import { track } from "@/lib/analytics";
import { SectionHeader } from "@/components/section-header";

const budgets = portfolioContent.contact.budgets;
type FormStatus = "idle" | "sending" | "sent" | "error";

export function ContactSection() {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [indiaTime, setIndiaTime] = useState("");
  const [offer, setOffer] = useState("");
  const { contact, hero, services } = portfolioContent;

  useEffect(() => {
    const choose = (event: Event) => setOffer((event as CustomEvent<string>).detail);
    window.addEventListener("contact:offer", choose);
    return () => window.removeEventListener("contact:offer", choose);
  }, []);

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
      track("contact-form-sent", offer ? { offer } : undefined);
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="ed-section section-shell container-x" id="contact" data-scene="contact" aria-labelledby="contact-heading">
      <div className="ed-contact-top">
        <SectionHeader
          index={contact.eyebrow.slice(0, 2)}
          label={contact.eyebrow.slice(5)}
          titleLines={[`${contact.title}.`]}
          id="contact-heading"
        />
        <span className="ed-now-tag ed-contact-status" data-layer="text" data-kind="contact-status"><i aria-hidden="true" />{hero.availability} · {hero.nextAvailability}</span>
      </div>

      <div className="ed-contact">
        <div>
          <p className="ed-lead" data-layer="text">{contact.introduction}</p>
          <div className="contact-actions">
            {services.bookHref && <a className="contact-cta" data-magnetic data-layer="button" data-kind="contact-cta" href={services.bookHref} target="_blank" rel="noreferrer" onClick={() => track("booking-opened")}>{services.bookLabel}<span aria-hidden="true">↗</span></a>}
            <button className={`contact-copy${copied ? " is-copied" : ""}`} data-layer="button" data-kind="contact-copy" type="button" onClick={copyEmail}>{copied ? "Copied ✓" : "Copy email"}</button>
          </div>
          <ul className="ed-rows contact-details" aria-label="Contact details">
            <li>
              <a className="contact-row" id="contact-email" data-layer="line" data-kind="contact-row" href={`mailto:${contact.email}`}>
                <span className="ed-label" data-layer="text">{contact.emailLabel}</span>
                <span className="contact-value" data-layer="text">{contact.email}</span>
                <i aria-hidden="true">↗</i>
              </a>
            </li>
            {contact.socials.map((item) => (
              <li key={item.label}>
                <a className="contact-row" data-layer="line" data-kind="contact-row" href={item.href} target="_blank" rel="noreferrer">
                  <span className="ed-label" data-layer="text">{item.label}</span>
                  <span className="contact-value" data-layer="text">{item.value}</span>
                  <i aria-hidden="true">↗</i>
                </a>
              </li>
            ))}
            <li className="contact-row is-static" data-layer="line" data-kind="contact-row">
              <span className="ed-label" data-layer="text">{contact.locationLabel}</span>
              <span className="contact-value" data-layer="text">{contact.location} · IST {indiaTime || "--:--"}</span>
            </li>
          </ul>
        </div>

        <form className="project-form" name="project-inquiry" method="POST" data-netlify="true" data-netlify-honeypot="bot-field" onSubmit={submitProject}>
          <input type="hidden" name="form-name" value="project-inquiry" />
          <input type="hidden" name="offer" value={offer} />
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
              {offer && (
                <p className="form-offer" role="status">
                  <span className="ed-label">{contact.offerLabel}</span>
                  <strong>{offer}</strong>
                  <button type="button" onClick={() => setOffer("")}>{contact.offerClear}</button>
                </p>
              )}
              <label className="form-control"><span>Name</span><input required name="name" autoComplete="name" placeholder="Your name" data-layer="line" data-kind="form-field" /></label>
              <label className="form-control"><span>Email</span><input required name="email" type="email" autoComplete="email" placeholder="you@company.com" data-layer="line" data-kind="form-field" /></label>
              <fieldset className="form-budget">
                <legend>Budget</legend>
                <div>
                  {budgets.map((budget) => (
                    <label className="form-budget-option" data-layer="text" data-kind="form-budget" key={budget}>
                      <input required type="radio" name="budget" value={budget} />
                      <span>{budget}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="form-control form-control-wide"><span>Message</span><textarea required name="message" rows={3} placeholder="What are we building?" data-layer="line" data-kind="form-field" /></label>
              <button className="form-submit" data-magnetic type="submit" disabled={status === "sending"} data-layer="button" data-kind="form-submit">{status === "sending" ? contact.formSending : contact.formSubmit} <span aria-hidden="true">↗</span></button>
              {status === "error" && <p className="form-error" role="alert">{contact.formError} <a href={`mailto:${contact.email}`}>{contact.email}</a></p>}
            </>
          )}
        </form>
      </div>
    </section>
  );
}
