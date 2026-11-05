"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { Media } from "@/data/case-studies";

/** A real screenshot or a silent footage loop. Loops play only while on screen, and not at all with reduced motion. */
export function CaseStudyMedia({ media, priority = false }: { media: Media; priority?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = video.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void element.play().catch(() => undefined);
      else element.pause();
    }, { threshold: 0.2 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (media.kind === "video") {
    return (
      <video
        ref={video}
        className="cs-media"
        src={media.src}
        poster={media.poster}
        width={media.width}
        height={media.height}
        aria-label={media.alt}
        muted
        loop
        playsInline
        preload="metadata"
      />
    );
  }
  return <Image className="cs-media" src={media.src} alt={media.alt} width={media.width} height={media.height} priority={priority} sizes="100vw" />;
}
