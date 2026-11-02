import type { MetadataRoute } from "next";
import { portfolioContent } from "@/data/content";

const siteOrigin = portfolioContent.siteUrl;

export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteOrigin) return [];
  return [{
    url: `${siteOrigin}/`,
    changeFrequency: "monthly",
    priority: 1
  }];
}
