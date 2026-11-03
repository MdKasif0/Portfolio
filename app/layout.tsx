import type { Metadata, Viewport } from "next";
import { anton, caveat, jakarta } from "@/app/fonts";
import { portfolioContent } from "@/data/content";
import { MotionShell } from "@/components/motion-shell";
import SiteCursor from "@/components/site-cursor";
import "./globals.css";

const { identity, about, contact, work, siteUrl } = portfolioContent;
const siteOrigin = siteUrl.replace(/\/$/, "");
const title = "Md Kasif Uddin (KASIF) — Frontend Developer & UI/UX Designer";
const description = "Md Kasif Uddin (KASIF) is a freelance frontend developer and UI/UX designer from India building fast, modern web apps, macOS tools and AI projects.";
const socialDescription = "I turn ideas into interfaces people feel: fast, modern, and built with AI. Explore projects by Md Kasif Uddin.";
const socialImage = { url: "/og-image.jpg", width: 1200, height: 630, type: "image/jpeg", alt: "KASIF portfolio: Frontend Developer & UI/UX Designer" };
const skills = about.toolkitGroups.flatMap((group) => group.skills);

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: { default: title, template: "%s · KASIF" },
  description,
  applicationName: "KASIF Portfolio",
  authors: [{ name: identity.name, url: siteOrigin }],
  creator: identity.name,
  publisher: identity.name,
  category: "technology",
  keywords: [
    "Md Kasif Uddin", "Kasif", "KASIF portfolio", "frontend developer", "UI/UX designer", "freelance web developer",
    "frontend developer India", "React developer", "Next.js developer", "TypeScript", "Three.js", "AI projects",
    "web development", "UI/UX design", "macOS app developer", "tech content creator", "Chandigarh University"
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  icons: {
    icon: [{ url: "/favicon-32.png", type: "image/png", sizes: "32x32" }, { url: "/favicon-48.png", type: "image/png", sizes: "48x48" }, { url: "/icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }]
  },
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: "profile",
    url: "/",
    siteName: "KASIF",
    locale: "en_IN",
    title,
    description: socialDescription,
    firstName: "Md Kasif",
    lastName: "Uddin",
    username: "md_kasif_uddin",
    images: [socialImage]
  },
  twitter: {
    card: "summary_large_image",
    site: "@md_kasif_uddin",
    creator: "@md_kasif_uddin",
    title,
    description: socialDescription,
    images: [{ url: socialImage.url, alt: socialImage.alt }]
  }
};

export const viewport: Viewport = { themeColor: "#05050A", colorScheme: "dark" };

/** schema.org graph: the site, its profile page, the person behind it and their projects. */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${siteOrigin}/#website`, url: `${siteOrigin}/`, name: "KASIF", alternateName: "Md Kasif Uddin Portfolio", description, inLanguage: "en", publisher: { "@id": `${siteOrigin}/#person` } },
    { "@type": "ProfilePage", "@id": `${siteOrigin}/#profile`, url: `${siteOrigin}/`, name: title, isPartOf: { "@id": `${siteOrigin}/#website` }, mainEntity: { "@id": `${siteOrigin}/#person` }, primaryImageOfPage: { "@type": "ImageObject", url: `${siteOrigin}${socialImage.url}`, width: 1200, height: 630 }, inLanguage: "en" },
    {
      "@type": "Person",
      "@id": `${siteOrigin}/#person`,
      name: identity.name,
      alternateName: identity.displayName,
      url: `${siteOrigin}/`,
      image: `${siteOrigin}/hero-cutout.png`,
      email: `mailto:${contact.email}`,
      jobTitle: "Frontend Developer and UI/UX Designer",
      description: about.bioLines.join(" "),
      address: { "@type": "PostalAddress", addressCountry: "IN" },
      alumniOf: { "@type": "CollegeOrUniversity", name: "Chandigarh University" },
      award: "1st Runner-Up, InnoSprint 2.0 hackathon (D4 Community × Google for Developers), 2026",
      knowsAbout: ["Frontend development", "UI/UX design", "Web development", "AI applications", ...skills],
      sameAs: contact.socials.map((social) => social.href)
    },
    {
      "@type": "ItemList",
      "@id": `${siteOrigin}/#work`,
      name: "Selected work",
      itemListElement: work.projects.map((project, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "CreativeWork",
          name: project.title,
          description: project.overview,
          url: project.liveHref || project.githubHref,
          image: `${siteOrigin}/projects/${project.cover}.webp`,
          dateCreated: project.year,
          keywords: project.stack.join(", "),
          creator: { "@id": `${siteOrigin}/#person` }
        }
      }))
    }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${anton.variable} ${jakarta.variable} ${caveat.variable}`}>
      <body><MotionShell><SiteCursor>{children}</SiteCursor></MotionShell><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></body>
    </html>
  );
}
