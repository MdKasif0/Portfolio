import type { MetadataRoute } from "next";
import { portfolioContent } from "@/data/content";

const siteOrigin = portfolioContent.siteUrl ? new URL(portfolioContent.siteUrl).origin : undefined;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    ...(siteOrigin ? { sitemap: `${siteOrigin}/sitemap.xml` } : {})
  };
}
