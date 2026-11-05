import type { MetadataRoute } from "next";
import { caseStudies } from "@/data/case-studies";
import { portfolioContent } from "@/data/content";

const siteOrigin = portfolioContent.siteUrl;

export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteOrigin) return [];
  return [
    { url: `${siteOrigin}/`, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    ...caseStudies.map(({ slug }) => ({ url: `${siteOrigin}/work/${slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 }))
  ];
}
