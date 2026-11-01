import type { MetadataRoute } from "next";
import { portfolioContent } from "@/data/content";

const siteOrigin = portfolioContent.siteUrl.replace("[PLACEHOLDER]", "portfolio.invalid");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteOrigin}/sitemap.xml`
  };
}
