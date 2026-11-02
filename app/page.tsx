import { MotionShell } from "@/components/motion-shell";
import { SiteNav } from "@/components/site-nav";
import { HeroSection } from "@/components/hero-section";
import { WorkSection } from "@/components/work-section";
import { CollaboratorStrip, RecognitionSection } from "@/components/collab-recognition";
import { AboutSection, JourneySection, RawToRealSection } from "@/components/about-journey";
import { ContactSection, SiteFooter } from "@/components/contact-footer";

export default function Home() {
  return (
    <MotionShell>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteNav />
      <main id="main-content">
        <HeroSection />
        <WorkSection />
        <CollaboratorStrip />
        <RecognitionSection />
        <RawToRealSection />
        <AboutSection />
        <JourneySection />
        <ContactSection />
      </main>
      <SiteFooter />
    </MotionShell>
  );
}
