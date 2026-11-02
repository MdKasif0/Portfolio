import type { Metadata } from "next";
import { anton, caveat, jakarta } from "@/app/fonts";
import { portfolioContent } from "@/data/content";
import "./globals.css";

const socialImage = portfolioContent.siteUrl
  ? new URL("/og-image.svg", portfolioContent.siteUrl).toString()
  : undefined;

export const metadata: Metadata = {
  title: "KASIF — Frontend Developer, UI/UX Designer & Tech Creator",
  description: "The portfolio of Md Kasif Uddin: freelance frontend developer, UI/UX designer and tech content creator.",
  applicationName: "KASIF Portfolio",
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }] },
  openGraph: {
    type: "website",
    title: "KASIF — Frontend Developer, UI/UX Designer & Tech Creator",
    description: "Ideas into interfaces people feel. Explore the work of Md Kasif Uddin.",
    siteName: "KASIF",
    ...(socialImage ? { images: [{ url: socialImage, width: 1200, height: 630, alt: "KASIF — Frontend Developer and UI/UX Designer" }] } : {})
  },
  twitter: {
    card: "summary_large_image",
    title: "KASIF — Frontend Developer, UI/UX Designer & Tech Creator",
    description: "Ideas into interfaces people feel. Explore the work of Md Kasif Uddin.",
    ...(socialImage ? { images: [socialImage] } : {})
  },
  ...(portfolioContent.siteUrl ? { metadataBase: new URL(portfolioContent.siteUrl) } : {})
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const personJsonLd = {
    "@context": "https://schema.org", "@type": "Person", name: portfolioContent.identity.name,
    jobTitle: "Frontend Developer and UI/UX Designer", url: portfolioContent.siteUrl,
    sameAs: ["https://x.com/md_kasif_uddin", "https://instagram.com/M_Kasif_Uddin", "https://github.com/MdKasif0"]
  };
  return (
    <html lang="en" className={`${anton.variable} ${jakarta.variable} ${caveat.variable}`}>
      <body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} /></body>
    </html>
  );
}
