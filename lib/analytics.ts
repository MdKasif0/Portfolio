/**
 * Privacy-friendly analytics through Umami: no cookies and no personal data.
 * Nothing loads and nothing is sent until NEXT_PUBLIC_UMAMI_WEBSITE_ID is set.
 * Page views are automatic. These are the extra moments worth counting.
 */
export type AnalyticsEvent =
  | "intro-completed"
  | "intro-skipped"
  | "reel-opened"
  | "reel-film-changed"
  | "reel-finished"
  | "architecture-tab"
  | "project-opened"
  | "case-study-opened"
  | "contact-reached"
  | "contact-form-sent"
  | "offer-chosen"
  | "booking-opened"
  | "demo-started"
  | "palette-opened"
  | "note-opened"
  | "cv-downloaded";

type Umami = { track: (event: string, data?: Record<string, string | number>) => void };

export function track(event: AnalyticsEvent, data?: Record<string, string | number>) {
  try {
    (window as Window & { umami?: Umami }).umami?.track(event, data);
  } catch {
    // Analytics must never break the page.
  }
}
