import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KASIF — Md Kasif Uddin Portfolio",
    short_name: "KASIF",
    description: "Frontend developer and UI/UX designer building fast, modern web apps and AI projects.",
    start_url: "/",
    display: "standalone",
    background_color: "#05050A",
    theme_color: "#05050A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }
    ]
  };
}
