"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { track } from "@/lib/analytics";

const WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const SCRIPT_URL = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL || "https://cloud.umami.is/script.js";

/** Loads Umami when it is configured, and counts the moments that can't be seen from page views. */
export function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!WEBSITE_ID) return;
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest?.('a[href$="cv.pdf"]')) track("cv-downloaded");
    };
    document.addEventListener("click", onClick);
    const contact = document.getElementById("contact");
    const observer = contact ? new IntersectionObserver((entries, self) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        track("contact-reached");
        self.disconnect();
      }
    }, { threshold: 0.2 }) : null;
    if (contact) observer?.observe(contact);
    return () => {
      document.removeEventListener("click", onClick);
      observer?.disconnect();
    };
  }, [pathname]);

  return WEBSITE_ID ? <Script src={SCRIPT_URL} data-website-id={WEBSITE_ID} strategy="afterInteractive" /> : null;
}
