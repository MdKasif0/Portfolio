import { MotionShell } from "@/components/motion-shell";
import { SiteNav } from "@/components/site-nav";
import { HeroSection } from "@/components/hero-section";
import { WorkSection } from "@/components/work-section";
import { CollaboratorStrip, RecognitionSection } from "@/components/collab-recognition";
import { AboutSection, JourneySection, RawToRealSection } from "@/components/about-journey";
import { ContactSection, SiteFooter } from "@/components/contact-footer";
import { Atmosphere, ContentDiagnostics, SectionRuler } from "@/components/design-system";
import { missingContentFields } from "@/data/content";

export default function Home() {
  return (
    <MotionShell>
      <Atmosphere />
      <ContentDiagnostics missing={missingContentFields} />
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteNav />
      <main id="main-content">
        <HeroSection />
        <SectionRuler index="01" />
        <WorkSection />
        <SectionRuler index="02" />
        <CollaboratorStrip />
        <SectionRuler index="03" />
        <RecognitionSection />
        <SectionRuler index="04" />
        <RawToRealSection />
        <SectionRuler index="05" />
        <AboutSection />
        <SectionRuler index="06" />
        <JourneySection />
        <SectionRuler index="07" />
        <ContactSection />
      </main>
      <SiteFooter />
    </MotionShell>
  );
}
