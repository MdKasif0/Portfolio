import type { MetadataRoute } from "next";
import { portfolioContent } from "@/data/content";

const siteOrigin = portfolioContent.siteUrl.replace("[PLACEHOLDER]", "portfolio.invalid");

export default function sitemap(): MetadataRoute.Sitemap {
  return [{
    url: `${siteOrigin}/`,
    changeFrequency: "monthly",
    priority: 1
  }];
}
