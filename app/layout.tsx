import type { Metadata } from "next";
import { Anton, Caveat, Plus_Jakarta_Sans } from "next/font/google";
import { portfolioContent } from "@/data/content";
import "./globals.css";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display"
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body"
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-script"
});

export const metadata: Metadata = {
  title: "KASIF — Frontend Developer, UI/UX Designer & Tech Creator",
  description: "The portfolio of Md Kasif Uddin: freelance frontend developer, UI/UX designer and tech content creator.",
  applicationName: "KASIF Portfolio",
  openGraph: {
    type: "website",
    title: "KASIF — Frontend Developer, UI/UX Designer & Tech Creator",
    description: "Ideas into interfaces people feel. Explore the work of Md Kasif Uddin.",
    siteName: "KASIF",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "KASIF — Frontend Developer and UI/UX Designer" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "KASIF — Frontend Developer, UI/UX Designer & Tech Creator",
    description: "Ideas into interfaces people feel. Explore the work of Md Kasif Uddin.",
    images: ["/og-image.svg"]
  },
  metadataBase: new URL(portfolioContent.siteUrl.replace("[PLACEHOLDER]", "portfolio.invalid"))
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${anton.variable} ${jakarta.variable} ${caveat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
