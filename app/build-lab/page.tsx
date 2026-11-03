import type { Metadata } from "next";
import { notFound } from "next/navigation";

// Temporary Build Mode test scene (dev only): one card built from scratch, then copy-pasted twice.
// Open /build-lab?buildDebug=1 with `npm run dev` to watch the scheduler's debug panel.

export const metadata: Metadata = { title: "Build lab", robots: { index: false, follow: false } };

const cards = [
  { title: "GitRoasted", body: "An AI roast of your GitHub profile, with heat.", meta: "2026 · WEB APP", image: "/hero-cutout.webp" },
  { title: "ReviewPilot", body: "AI reviews that make pull requests easy to read.", meta: "2025 · AI TOOL", image: "/og-image.svg" },
  { title: "GreenBoard", body: "A tutor marketplace for learners and teachers.", meta: "2025 · PLATFORM", image: "/hero-cutout-mobile.webp" }
];

export default function BuildLab() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main style={{ minHeight: "100vh", padding: "120px 48px", background: "#05050a" }}>
      <section id="lab" style={{ display: "grid", gridTemplateColumns: "repeat(3, 300px)", gap: 24, justifyContent: "center" }}>
        {cards.map((card) => (
          <article key={card.title} data-layer="card" data-kind="lab-card" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16, border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, background: "#0B0B12" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img data-layer="image" data-kind="lab-image" src={card.image} alt="" style={{ display: "block", width: "100%", height: 160, objectFit: "cover", borderRadius: 10, background: "#14141c" }} />
            <h3 data-layer="text" data-kind="lab-title" style={{ margin: 0, color: "#F7F7F8", fontFamily: "var(--font-display), Impact, sans-serif", fontSize: 34, fontWeight: 400, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {card.title}<span style={{ color: "#E5322D" }}>.</span>
            </h3>
            <p data-layer="text" data-kind="lab-body" style={{ margin: 0, color: "#A5A4AE", fontSize: 13, lineHeight: 1.5 }}>{card.body}</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span data-layer="text" data-kind="lab-meta" style={{ color: "#8D8C96", fontSize: 10, fontWeight: 700, letterSpacing: ".14em" }}>{card.meta}</span>
              <span data-layer="icon" data-kind="lab-arrow" style={{ display: "grid", width: 28, height: 28, placeItems: "center", border: "1px solid rgba(229,50,45,.6)", borderRadius: "50%", color: "#E5322D" }}>
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 12 12 4M6 4h6v6" /></svg>
              </span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
