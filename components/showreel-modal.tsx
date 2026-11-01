"use client";

import { useEffect, useRef } from "react";
import { portfolioContent } from "@/data/content";

function getEmbedUrl(source: string) {
  try {
    const url = new URL(source);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const videoId = url.pathname.slice(1);
      return videoId ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const videoId = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
      return videoId ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` : null;
    }

    if (host === "x.com" || host === "twitter.com") {
      const postId = url.pathname.match(/\/status\/(\d+)/)?.[1];
      return postId ? `https://platform.twitter.com/embed/Tweet.html?id=${postId}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function ShowreelModal({ onClose }: { onClose: () => void }) {
  const { hero, contact } = portfolioContent;
  const embedUrl = getEmbedUrl(hero.reelEmbedUrl);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    closeButton.current?.focus();
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const dialog = closeButton.current?.closest<HTMLElement>('[role="dialog"]');
      const focusable = dialog?.querySelectorAll<HTMLElement>("button, iframe, a[href], [tabindex]:not([tabindex='-1'])");
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div className="reel-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="reel-dialog" role="dialog" aria-modal="true" aria-labelledby="reel-title" tabIndex={-1}>
        <div className="reel-dialog-heading">
          <div>
            <p className="reel-kicker">{contact.reelModalKicker}</p>
            <h2 id="reel-title">{contact.reelModalTitle}<span className="title-period">.</span></h2>
          </div>
          <button ref={closeButton} className="reel-close" type="button" onClick={onClose} aria-label="Close showreel">×</button>
        </div>
        <div className="reel-frame">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title="Kasif portfolio showreel"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="reel-placeholder">
              <span className="reel-placeholder-icon" aria-hidden="true">▶</span>
              <p>{contact.reelPlaceholderLabel}</p>
              <span>{contact.reelPlaceholderInstruction}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
