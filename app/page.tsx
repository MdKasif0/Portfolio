import { existsSync } from "node:fs";
import { join } from "node:path";
import { MotionShell } from "@/components/motion-shell";
import { SiteNav } from "@/components/site-nav";
import { HeroSection } from "@/components/hero-section";
import { WorkSection } from "@/components/work-section";
import { CollaboratorStrip, RecognitionSection } from "@/components/collab-recognition";
import { AboutSection, JourneySection, RawToRealSection } from "@/components/about-journey";
import { ContactSection } from "@/components/contact-footer";
import { SiteFooter } from "@/components/site-footer";
import { Atmosphere, RulerDivider } from "@/components/design-primitives";

export default function Home() {
  const cvAvailable = existsSync(join(process.cwd(), "public", "cv.pdf"));
  const projectImages = Object.fromEntries(
    ["GitRoasted", "ReviewPilot", "GreenBoard", "Gravites Network", "AI Checkers Arena", "Cookie", "ShiftKit"]
      .map((title) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-"))
      .filter((slug) => existsSync(join(process.cwd(), "public", "projects", `${slug}.webp`)))
      .map((slug) => [slug, `/projects/${slug}.webp`])
  );
  return (
    <MotionShell>
      <Atmosphere />
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteNav />
      <main id="main-content">
        <HeroSection cvAvailable={cvAvailable} />
        <RulerDivider label="001 / 064" />
        <WorkSection projectImages={projectImages} />
        <RulerDivider label="002 / 128" />
        <CollaboratorStrip />
        <RulerDivider label="003 / 192" />
        <RecognitionSection />
        <RulerDivider label="004 / 256" />
        <RawToRealSection />
        <RulerDivider label="005 / 320" />
        <AboutSection />
        <RulerDivider label="006 / 384" />
        <JourneySection />
        <RulerDivider label="007 / 448" />
        <ContactSection />
      </main>
      <SiteFooter />
    </MotionShell>
  );
}
