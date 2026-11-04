"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { portfolioContent } from "@/data/content";

const { reels, reelContactLabel } = portfolioContent.hero;
const { reelModalKicker } = portfolioContent.contact;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SKIP = 5;
const IDLE_AFTER = 2600;
const VOLUME_KEY = "kasif-reel-volume";
const MUTED_KEY = "kasif-reel-muted";
const AUTOPLAY_KEY = "kasif-reel-autoplay";
const NEXT_COUNTDOWN = 5;

type Film = (typeof reels)[number];
type NetworkInfo = { saveData?: boolean; effectiveType?: string; downlink?: number };
type WebkitVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };
type Flash = { id: number; kind: "play" | "pause" | "back" | "forward" | "volume" | "muted"; label?: string };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const formatTime = (seconds: number) => {
  const whole = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};
const readStored = (key: string) => {
  try { return window.localStorage.getItem(key); } catch { return null; }
};
const writeStored = (key: string, value: string) => {
  try { window.localStorage.setItem(key, value); } catch { /* Private windows can block storage; the player works without it. */ }
};
const chapterAt = (film: Film, time: number) => {
  let index = 0;
  film.chapters.forEach((chapter, i) => { if (time >= chapter.start) index = i; });
  return index;
};
/** The best rendition a film has at or below the wanted height: only the portfolio film has a 4K master. */
const sourceFor = (film: Film, height: number): Film["sources"][number] =>
  film.sources.find((item) => item.height <= height) ?? film.sources[film.sources.length - 1];

/** Picks a rendition for this screen and connection. 4K is only automatic on large displays with a fast link. */
function pickAutoHeight() {
  const network = (navigator as Navigator & { connection?: NetworkInfo }).connection;
  if (network?.saveData || /(^|-)(2g|3g)$/.test(network?.effectiveType ?? "")) return 720;
  if (window.innerWidth <= 640) return 720;
  if (window.innerWidth * window.devicePixelRatio >= 2560 && (network?.downlink ?? 0) >= 10) return 2160;
  return 1080;
}

function Icon({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return <svg className="rp-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
}
const IconPlay = () => <Icon><path fill="currentColor" d="M8 5.6c0-.8.9-1.3 1.6-.9l10 6.4c.6.4.6 1.3 0 1.7l-10 6.4c-.7.4-1.6 0-1.6-.9V5.6Z" /></Icon>;
const IconPause = () => <Icon><rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" /><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" /></Icon>;
const IconReplay = () => <Icon><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5L4.5 8.8M4.5 4.5v4.3h4.3" /></Icon>;
const IconTrack = ({ next }: { next?: boolean }) => (
  <Icon><g transform={next ? undefined : "matrix(-1 0 0 1 24 0)"}><path fill="currentColor" d="M5 6.300c0-.8.9-1.300 1.600-.9l9 5.700c.6.400.6 1.300 0 1.700l-9 5.700c-.7.500-1.600 0-1.600-.8V6.300Z" /><rect x="16.800" y="5" width="2.700" height="14" rx="1.200" fill="currentColor" /></g></Icon>
);
const IconSkip = ({ forward }: { forward?: boolean }) => (
  <Icon>
    <g transform={forward ? "matrix(-1 0 0 1 24 0)" : undefined}><path fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" d="M5 12.5a7.5 7.5 0 1 0 2.5-5.6L5 9M5 4.8V9h4.2" /></g>
    <text x="12" y="16" textAnchor="middle" fontSize="7.4" fontWeight="800" fill="currentColor" fontFamily="inherit">{SKIP}</text>
  </Icon>
);
const IconVolume = ({ level }: { level: number }) => (
  <Icon>
    <path fill="currentColor" d="M4 9.6v4.8c0 .5.4.9.9.9h2.6l4 3.3c.6.5 1.5.1 1.5-.7V6.1c0-.8-.9-1.2-1.5-.7l-4 3.3H4.9c-.5 0-.9.4-.9.9Z" />
    {level === 0 ? <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="m16.5 9.5 5 5m0-5-5 5" /> : <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M16.2 9.2a4 4 0 0 1 0 5.6" />}
    {level > 0.5 && <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M18.8 6.6a7.6 7.6 0 0 1 0 10.8" />}
  </Icon>
);
const IconSettings = () => <Icon><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M4 7h9m5 0h2M4 17h2m5 0h9" /><circle cx="15.5" cy="7" r="2.4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="8.5" cy="17" r="2.4" fill="none" stroke="currentColor" strokeWidth="2" /></Icon>;
const IconPip = () => <Icon><rect x="3" y="5" width="18" height="14" rx="2.4" fill="none" stroke="currentColor" strokeWidth="2" /><rect x="12" y="11.5" width="6.5" height="5" rx="1" fill="currentColor" /></Icon>;
const IconFullscreen = ({ active }: { active: boolean }) => (
  <Icon><path fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" d={active ? "M9 4v3.5A1.5 1.5 0 0 1 7.5 9H4m16 0h-3.500A1.5 1.5 0 0 1 15 7.500V4M4 15h3.500A1.500 1.500 0 0 1 9 16.500V20m6 0v-3.500a1.500 1.500 0 0 1 1.500-1.500H20" : "M4 9V5.500A1.500 1.500 0 0 1 5.500 4H9m6 0h3.500A1.500 1.500 0 0 1 20 5.500V9m0 6v3.500a1.500 1.500 0 0 1-1.500 1.500H15m-6 0H5.500A1.500 1.500 0 0 1 4 18.500V15"} /></Icon>
);

export function ReelPlayer({ onContact, onClose }: { onContact: () => void; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const clickTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastTap = useRef(0);
  const pointerType = useRef("mouse");
  const restore = useRef<{ time: number; play: boolean } | null>(null);
  const stalls = useRef(0);
  const scrub = useRef<{ resume: boolean; pending: number | null } | null>(null);
  const flashId = useRef(0);
  const speedRef = useRef(1);

  const [index, setIndex] = useState(0);
  const [autoplayNext, setAutoplayNext] = useState(() => {
    const stored = readStored(AUTOPLAY_KEY);
    return stored === null ? !window.matchMedia("(prefers-reduced-motion: reduce)").matches : stored === "1";
  });
  const [countdown, setCountdown] = useState<number | null>(null);
  const [height, setHeight] = useState(() => pickAutoHeight());
  const [qualityChoice, setQualityChoice] = useState<"auto" | number>("auto");
  const [paused, setPaused] = useState(true);
  const [started, setStarted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [ended, setEnded] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState<number>(reels[0].duration);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [idle, setIdle] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);

  const idleRef = useRef(idle);
  idleRef.current = idle;
  const menuRef = useRef(menuOpen);
  menuRef.current = menuOpen;

  const film = reels[index];
  const nextIndex = (index + 1) % reels.length;
  const previousIndex = (index - 1 + reels.length) % reels.length;
  const nextFilm = reels[nextIndex];
  const isLastFilm = index === reels.length - 1;
  const queue = reels.map((_, offset) => reels[(index + offset + 1) % reels.length]).slice(0, reels.length - 1);
  const source = sourceFor(film, height);
  const chapterIndex = chapterAt(film, time);
  const chapter = film.chapters[chapterIndex];

  const filmRef = useRef(film);
  filmRef.current = film;
  const heightRef = useRef(height);
  heightRef.current = height;
  const autoplayRef = useRef(autoplayNext);
  autoplayRef.current = autoplayNext;
  const isLastRef = useRef(isLastFilm);
  isLastRef.current = isLastFilm;

  const paintProgress = useCallback((seconds: number, total: number) => {
    track.current?.style.setProperty("--p", String(total ? clamp(seconds / total, 0, 1) : 0));
  }, []);

  const showFlash = useCallback((kind: Flash["kind"], label?: string) => {
    flashId.current += 1;
    setFlash({ id: flashId.current, kind, label });
  }, []);

  const wake = useCallback(() => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      const element = video.current;
      if (element && !element.paused && !menuRef.current && !scrub.current) setIdle(true);
    }, IDLE_AFTER);
  }, []);

  const togglePlay = useCallback((withFlash = true) => {
    const element = video.current;
    if (!element) return;
    if (element.paused || element.ended) {
      void element.play().catch(() => setBlocked(true));
      if (withFlash) showFlash("play");
    } else {
      element.pause();
      if (withFlash) showFlash("pause");
    }
  }, [showFlash]);

  const seekTo = useCallback((seconds: number) => {
    const element = video.current;
    if (!element) return;
    const total = element.duration || filmRef.current.duration;
    const target = clamp(seconds, 0, total);
    element.currentTime = target;
    setTime(target);
    setEnded(false);
    setCountdown(null);
    paintProgress(target, total);
  }, [paintProgress]);

  const seekBy = useCallback((delta: number) => {
    const element = video.current;
    if (!element) return;
    seekTo(element.currentTime + delta);
    showFlash(delta < 0 ? "back" : "forward", `${SKIP}s`);
  }, [seekTo, showFlash]);

  const changeVolume = useCallback((next: number, withFlash = false) => {
    const element = video.current;
    if (!element) return;
    const value = clamp(next, 0, 1);
    element.volume = value;
    element.muted = value === 0;
    if (withFlash) showFlash(value === 0 ? "muted" : "volume", `${Math.round(value * 100)}%`);
  }, [showFlash]);

  const toggleMute = useCallback(() => {
    const element = video.current;
    if (!element) return;
    const nextMuted = !element.muted && element.volume > 0;
    element.muted = nextMuted;
    if (!nextMuted && element.volume === 0) element.volume = 0.6;
    showFlash(nextMuted ? "muted" : "volume", nextMuted ? "Muted" : `${Math.round(element.volume * 100)}%`);
  }, [showFlash]);

  const toggleFullscreen = useCallback(() => {
    const player = root.current;
    const element = video.current as WebkitVideo | null;
    if (!player || !element) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (player.requestFullscreen) {
      void player.requestFullscreen().then(() => {
        const orientation = screen.orientation as ScreenOrientation & { lock?: (value: string) => Promise<void> };
        void orientation.lock?.("landscape").catch(() => undefined);
      }).catch(() => element.webkitEnterFullscreen?.());
    } else {
      // iPhone Safari only allows the video element itself to go fullscreen.
      element.webkitEnterFullscreen?.();
    }
  }, []);

  const togglePip = useCallback(() => {
    const element = video.current;
    if (!element) return;
    if (document.pictureInPictureElement) void document.exitPictureInPicture();
    else void element.requestPictureInPicture().catch(() => undefined);
  }, []);

  const changeSpeed = useCallback((value: number) => {
    speedRef.current = value;
    setSpeed(value);
    if (video.current) video.current.playbackRate = value;
  }, []);

  const changeHeight = useCallback((next: number) => {
    const element = video.current;
    if (!element) return;
    if (next === heightRef.current) return;
    // Only reload when this film actually has a different file at that height.
    if (sourceFor(filmRef.current, next).src !== sourceFor(filmRef.current, heightRef.current).src) {
      restore.current = { time: element.currentTime, play: !element.paused && !element.ended };
      setWaiting(true);
    }
    setHeight(next);
  }, []);

  /** Keeps the same video element across films, because that is what preserves sound permission on iPhones. */
  const selectFilm = useCallback((next: number) => {
    restore.current = { time: 0, play: true };
    stalls.current = 0;
    setIndex(next);
    setTime(0);
    setDuration(reels[next].duration);
    setBuffered(0);
    setEnded(false);
    setFailed(false);
    setWaiting(true);
    setCountdown(null);
    setHover(null);
    setMenuOpen(false);
    paintProgress(0, 1);
    root.current?.focus({ preventScroll: true });
    root.current?.closest(".reel-backdrop")?.scrollTo({ top: 0, behavior: "smooth" });
  }, [paintProgress]);

  const toggleAutoplay = useCallback(() => {
    setAutoplayNext((current) => {
      writeStored(AUTOPLAY_KEY, current ? "0" : "1");
      if (current) setCountdown(null);
      return !current;
    });
  }, []);

  const replay = useCallback(() => {
    seekTo(0);
    void video.current?.play().catch(() => setBlocked(true));
  }, [seekTo]);

  const retry = useCallback(() => {
    setFailed(false);
    setWaiting(true);
    video.current?.load();
    void video.current?.play().catch(() => setBlocked(true));
  }, []);

  // Start with sound on the click that opened the reel, and restore this viewer's volume.
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const storedVolume = Number(readStored(VOLUME_KEY));
    if (readStored(VOLUME_KEY) !== null && Number.isFinite(storedVolume)) element.volume = clamp(storedVolume, 0, 1);
    element.muted = readStored(MUTED_KEY) === "1";
    setVolume(element.volume);
    setMuted(element.muted);
    setPipSupported(Boolean(document.pictureInPictureEnabled));
    root.current?.focus({ preventScroll: true });
    void element.play().catch(() => setBlocked(true));
    return () => {
      clearTimeout(idleTimer.current);
      clearTimeout(clickTimer.current);
      if (document.pictureInPictureElement === element) void document.exitPictureInPicture().catch(() => undefined);
      // Stop the download as well as the sound when the reel closes.
      element.pause();
      element.removeAttribute("src");
      element.load();
    };
  }, []);

  // A smooth playhead between the browser's coarse timeupdate events.
  useEffect(() => {
    if (paused) return;
    let frame = 0;
    const tick = () => {
      const element = video.current;
      if (element) paintProgress(element.currentTime, element.duration || filmRef.current.duration);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, paintProgress]);

  useEffect(() => {
    if (paused || menuOpen) { clearTimeout(idleTimer.current); setIdle(false); }
    else wake();
  }, [paused, menuOpen, wake]);

  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  // When a film ends with autoplay on, count down and then start the next one.
  const counting = countdown !== null;
  useEffect(() => {
    if (!counting) return;
    const startedAt = performance.now();
    const timer = setInterval(() => {
      const left = NEXT_COUNTDOWN - (performance.now() - startedAt) / 1000;
      if (left <= 0) {
        clearInterval(timer);
        selectFilm(nextIndex);
      } else setCountdown(left);
    }, 100);
    return () => clearInterval(timer);
  }, [counting, nextIndex, selectFilm]);

  // Keep the active chapter in view when the rail scrolls on small screens.
  useEffect(() => {
    const container = rail.current;
    const active = container?.children[chapterIndex] as HTMLElement | undefined;
    if (!container || !active || container.scrollWidth <= container.clientWidth) return;
    container.scrollTo({ left: active.offsetLeft - (container.clientWidth - active.offsetWidth) / 2, behavior: "smooth" });
  }, [chapterIndex, index]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    session.metadata = new MediaMetadata({ title: `${film.title}: ${film.tagline}`, artist: portfolioContent.identity.name, artwork: [{ src: film.poster, sizes: "1920x1080", type: "image/jpeg" }] });
    session.setActionHandler("play", () => void video.current?.play());
    session.setActionHandler("pause", () => video.current?.pause());
    session.setActionHandler("seekbackward", () => seekBy(-SKIP));
    session.setActionHandler("seekforward", () => seekBy(SKIP));
    session.setActionHandler("nexttrack", () => selectFilm(nextIndex));
    session.setActionHandler("previoustrack", () => selectFilm(previousIndex));
    return () => {
      session.metadata = null;
      (["play", "pause", "seekbackward", "seekforward", "nexttrack", "previoustrack"] as const).forEach((action) => session.setActionHandler(action, null));
    };
  }, [film, nextIndex, previousIndex, seekBy, selectFilm]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Escape" && menuRef.current) {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      const target = event.target instanceof HTMLElement ? event.target : null;
      const onControl = Boolean(target?.closest("button, a"));
      const onRange = target?.tagName === "INPUT";
      const element = video.current;
      if (!element) return;
      const handled = () => { event.preventDefault(); wake(); };
      switch (event.key) {
        case " ":
          if (onControl) return;
          handled(); togglePlay();
          break;
        case "k": case "K":
          handled(); togglePlay();
          break;
        case "ArrowLeft": case "j": case "J":
          if (onRange) return;
          handled(); seekBy(-SKIP);
          break;
        case "ArrowRight": case "l": case "L":
          if (onRange) return;
          handled(); seekBy(SKIP);
          break;
        case "ArrowUp":
          if (onRange) return;
          handled(); changeVolume((element.muted ? 0 : element.volume) + 0.1, true);
          break;
        case "ArrowDown":
          if (onRange) return;
          handled(); changeVolume((element.muted ? 0 : element.volume) - 0.1, true);
          break;
        case "m": case "M":
          handled(); toggleMute();
          break;
        case "f": case "F":
          handled(); toggleFullscreen();
          break;
        case "n": case "N":
          handled(); selectFilm(nextIndex);
          break;
        case "p": case "P":
          handled(); selectFilm(previousIndex);
          break;
        case "Home":
          handled(); seekTo(0);
          break;
        case "End":
          handled(); seekTo(element.duration || filmRef.current.duration);
          break;
        default:
          if (/^[0-9]$/.test(event.key)) {
            handled();
            seekTo((Number(event.key) / 10) * (element.duration || filmRef.current.duration));
          }
      }
    };
    // Capture phase, so Escape reaches the settings menu before the modal however often this effect re-runs.
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [changeVolume, nextIndex, previousIndex, seekBy, seekTo, selectFilm, toggleFullscreen, toggleMute, togglePlay, wake]);

  const ratioFromEvent = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return rect.width ? clamp((event.clientX - rect.left) / rect.width, 0, 1) : 0;
  };

  const scrubTo = (ratio: number) => {
    const element = video.current;
    if (!element) return;
    const total = element.duration || filmRef.current.duration;
    const target = ratio * total;
    setTime(target);
    paintProgress(target, total);
    setEnded(false);
    setCountdown(null);
    // Wait for the last seek to land, so dragging stays smooth on slower decoders.
    if (element.seeking && scrub.current) scrub.current.pending = target;
    else element.currentTime = target;
  };

  const onTrackDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const element = video.current;
    if (!element || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    scrub.current = { resume: !element.paused && !element.ended, pending: null };
    setScrubbing(true);
    element.pause();
    const ratio = ratioFromEvent(event);
    setHover(ratio);
    scrubTo(ratio);
  };

  const onTrackMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const ratio = ratioFromEvent(event);
    setHover(ratio);
    if (scrub.current) scrubTo(ratio);
  };

  const onTrackUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const element = video.current;
    const state = scrub.current;
    if (!state || !element) return;
    scrubTo(ratioFromEvent(event));
    scrub.current = null;
    setScrubbing(false);
    if (event.pointerType !== "mouse") setHover(null);
    if (state.resume) void element.play().catch(() => setBlocked(true));
  };

  const onStageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (menuOpen) { setMenuOpen(false); return; }
    if (pointerType.current === "mouse") {
      clearTimeout(clickTimer.current);
      if (event.detail > 1) return;
      clickTimer.current = setTimeout(() => togglePlay(), 190);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const zone = ratio < 1 / 3 ? -1 : ratio > 2 / 3 ? 1 : 0;
    const now = event.timeStamp;
    if (zone !== 0 && now - lastTap.current < 300) {
      clearTimeout(clickTimer.current);
      lastTap.current = now;
      seekBy(zone * SKIP);
      wake();
      return;
    }
    lastTap.current = now;
    clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      if (idleRef.current) wake();
      else { togglePlay(); wake(); }
    }, 300);
  };

  const onStageDoubleClick = () => {
    if (pointerType.current !== "mouse") return;
    clearTimeout(clickTimer.current);
    toggleFullscreen();
  };

  const volumeLevel = muted ? 0 : volume;
  const previewRatio = hover ?? 0;
  const previewTime = previewRatio * duration;
  const { previews } = film;
  const previewFrames = Math.min(previews.columns * previews.rows, Math.floor(film.duration / previews.interval) + 1);
  const previewIndex = clamp(Math.floor(previewTime / previews.interval), 0, previewFrames - 1);
  const previewChapter = film.chapters[chapterAt(film, previewTime)];
  const previewStyle: CSSProperties = {
    backgroundImage: `url(${previews.src})`,
    backgroundSize: `${previews.columns * 100}% ${previews.rows * 100}%`,
    backgroundPosition: `${((previewIndex % previews.columns) / (previews.columns - 1)) * 100}% ${(Math.floor(previewIndex / previews.columns) / (previews.rows - 1)) * 100}%`
  };
  const showBigPlay = paused && !ended && !failed && !scrubbing && (started || blocked);

  return (
    <>
      <header className="reel-dialog-heading">
        <div>
          <p className="reel-kicker">{reelModalKicker} · {index + 1} OF {reels.length}</p>
          <h2 id="reel-title">{film.title}<span className="title-period">.</span> <span className="reel-tagline">{film.tagline}</span></h2>
        </div>
        <button className="reel-close" data-magnetic type="button" onClick={onClose} aria-label="Close showreel">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" d="m5 5 14 14M19 5 5 19" /></svg>
        </button>
      </header>

      <div
        ref={root}
        className={`rp${idle ? " is-idle" : ""}${paused ? " is-paused" : ""}${scrubbing ? " is-scrubbing" : ""}`}
        data-cursor-native
        tabIndex={-1}
        onPointerMove={(event) => { if (event.pointerType === "mouse") wake(); }}
        onPointerDown={(event) => {
          pointerType.current = event.pointerType;
          if (menuOpen && !(event.target as HTMLElement).closest(".rp-menu, .rp-menu-toggle")) setMenuOpen(false);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "mouse") return;
          setHover(null);
          clearTimeout(idleTimer.current);
          idleTimer.current = setTimeout(() => {
            if (video.current && !video.current.paused && !menuRef.current && !scrub.current) setIdle(true);
          }, 700);
        }}
      >
        <video
          ref={video}
          className="rp-video"
          src={source.src}
          poster={film.poster}
          preload="auto"
          playsInline
          aria-label={film.description}
          onPlay={() => { setPaused(false); setStarted(true); setBlocked(false); setEnded(false); setCountdown(null); }}
          onPause={(event) => { if (!event.currentTarget.ended) setPaused(true); }}
          onEnded={(event) => {
            setPaused(true);
            setEnded(true);
            setIdle(false);
            paintProgress(event.currentTarget.duration, event.currentTarget.duration);
            if (autoplayRef.current && !isLastRef.current) setCountdown(NEXT_COUNTDOWN);
          }}
          onWaiting={(event) => {
            setWaiting(true);
            const element = event.currentTarget;
            if (qualityChoice !== "auto" || element.seeking || element.currentTime < 0.2) return;
            // Two real stalls on Auto: step down a rendition instead of stalling again.
            stalls.current += 1;
            if (stalls.current >= 2) {
              stalls.current = 0;
              const lower = film.sources.find((item) => item.height < source.height);
              if (lower) changeHeight(lower.height);
            }
          }}
          onPlaying={() => setWaiting(false)}
          onCanPlay={() => setWaiting(false)}
          onSeeked={(event) => {
            setWaiting(false);
            const pending = scrub.current?.pending;
            if (scrub.current && pending != null) {
              scrub.current.pending = null;
              event.currentTarget.currentTime = pending;
            }
          }}
          onTimeUpdate={(event) => {
            const element = event.currentTarget;
            if (scrub.current) return;
            setTime(element.currentTime);
            paintProgress(element.currentTime, element.duration || filmRef.current.duration);
          }}
          onProgress={(event) => {
            const element = event.currentTarget;
            const ranges = element.buffered;
            for (let i = ranges.length - 1; i >= 0; i -= 1) {
              if (ranges.start(i) <= element.currentTime + 0.1) { setBuffered(ranges.end(i)); break; }
            }
          }}
          onLoadedMetadata={(event) => {
            const element = event.currentTarget;
            setDuration(element.duration || filmRef.current.duration);
            setFailed(false);
            element.playbackRate = speedRef.current;
            const pending = restore.current;
            if (pending) {
              restore.current = null;
              element.currentTime = pending.time;
              if (pending.play) void element.play().catch(() => setBlocked(true));
            }
          }}
          onVolumeChange={(event) => {
            const element = event.currentTarget;
            setVolume(element.volume);
            setMuted(element.muted);
            writeStored(VOLUME_KEY, String(element.volume));
            writeStored(MUTED_KEY, element.muted ? "1" : "0");
          }}
          onError={() => { setWaiting(false); setFailed(true); }}
        />

        <div className="rp-stage" onClick={onStageClick} onDoubleClick={onStageDoubleClick} aria-hidden="true" />

        {waiting && !failed && !ended && <div className="rp-spinner" aria-hidden="true"><i /></div>}

        {flash && (
          <div key={flash.id} className={`rp-flash rp-flash--${flash.kind}`} aria-hidden="true">
            <span className="rp-flash-disc">
              {flash.kind === "play" && <IconPlay />}
              {flash.kind === "pause" && <IconPause />}
              {flash.kind === "back" && <IconSkip />}
              {flash.kind === "forward" && <IconSkip forward />}
              {(flash.kind === "volume" || flash.kind === "muted") && <IconVolume level={flash.kind === "muted" ? 0 : 1} />}
            </span>
            {flash.label && flash.kind !== "back" && flash.kind !== "forward" && <span className="rp-flash-label">{flash.label}</span>}
          </div>
        )}

        {showBigPlay && (
          <button type="button" className="rp-bigplay" onClick={() => togglePlay(false)} aria-label={started ? "Resume reel" : "Play reel"}>
            <IconPlay />
          </button>
        )}

        {ended && countdown !== null && (
          <div className="rp-end rp-upnext" role="status">
            <div className="rp-upnext-card">
              <p className="rp-upnext-label">Up next in {Math.ceil(countdown)}</p>
              <div className="rp-upnext-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={nextFilm.thumb} alt="" />
                <i style={{ transform: `scaleX(${1 - countdown / NEXT_COUNTDOWN})` }} />
              </div>
              <p className="rp-upnext-title">{nextFilm.title}<b>.</b> <span>{nextFilm.tagline}</span></p>
              <div className="rp-upnext-actions">
                <button type="button" className="rp-end-secondary" onClick={() => setCountdown(null)}>Cancel</button>
                <button type="button" className="rp-end-primary" onClick={() => selectFilm(nextIndex)}><IconPlay />Play now</button>
              </div>
            </div>
          </div>
        )}

        {ended && countdown === null && (
          <div className="rp-end">
            <button type="button" className={isLastFilm ? "rp-end-primary" : "rp-end-secondary"} onClick={replay}><IconReplay />Watch again</button>
            {!isLastFilm && <button type="button" className="rp-end-primary" onClick={() => selectFilm(nextIndex)}><IconPlay />Next: {nextFilm.title}</button>}
            <button type="button" className="rp-end-secondary" onClick={onContact}>{reelContactLabel}<span aria-hidden="true">→</span></button>
          </div>
        )}

        {failed && (
          <div className="rp-end rp-end--error" role="alert">
            <p>The reel could not load. Check your connection and try again.</p>
            <button type="button" className="rp-end-primary" onClick={retry}><IconReplay />Try again</button>
          </div>
        )}

        {menuOpen && (
          <div className="rp-menu" onClick={(event) => { if (event.detail > 0) root.current?.focus({ preventScroll: true }); }}>
            <div className="rp-menu-group" role="group" aria-label="Speed">
              <p className="rp-menu-title">Speed</p>
              {SPEEDS.map((value) => (
                <button key={value} type="button" className="rp-menu-item" aria-pressed={speed === value} onClick={() => changeSpeed(value)}>
                  {value === 1 ? "Normal" : `${value}×`}
                </button>
              ))}
            </div>
            <div className="rp-menu-group" role="group" aria-label="Quality">
              <p className="rp-menu-title">Quality</p>
              <button type="button" className="rp-menu-item" aria-pressed={qualityChoice === "auto"} onClick={() => { setQualityChoice("auto"); changeHeight(pickAutoHeight()); }}>
                Auto{qualityChoice === "auto" && <em>{source.label}</em>}
              </button>
              {film.sources.map((item) => (
                <button key={item.height} type="button" className="rp-menu-item" aria-pressed={qualityChoice !== "auto" && source.height === item.height} onClick={() => { setQualityChoice(item.height); changeHeight(item.height); }}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rp-controls" onClick={(event) => { if (event.detail > 0) root.current?.focus({ preventScroll: true }); }}>
          <div
            ref={track}
            className="rp-track"
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(time)}
            aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}, ${chapter.title}`}
            onPointerDown={onTrackDown}
            onPointerMove={onTrackMove}
            onPointerUp={onTrackUp}
            onPointerCancel={onTrackUp}
            onPointerLeave={() => { if (!scrub.current) setHover(null); }}
          >
            <div className="rp-track-rail">
              <i className="rp-track-buffered" style={{ transform: `scaleX(${duration ? buffered / duration : 0})` }} />
              {hover !== null && <i className="rp-track-hover" style={{ transform: `scaleX(${hover})` }} />}
              <i className="rp-track-fill" />
              {film.chapters.slice(1).map((item) => <b key={item.start} className="rp-track-tick" style={{ left: `${(item.start / duration) * 100}%` }} />)}
            </div>
            <i className="rp-track-head" />
            {hover !== null && (
              <div className="rp-preview" style={{ "--h": hover } as CSSProperties} aria-hidden="true">
                <div className="rp-preview-frame" style={previewStyle} />
                <div className="rp-preview-label"><strong>{previewChapter.title}</strong><span>{formatTime(previewTime)}</span></div>
              </div>
            )}
          </div>

          <div className="rp-bar">
            <button type="button" className="rp-btn rp-btn--previous" onClick={() => selectFilm(previousIndex)} aria-label={`Previous: ${reels[previousIndex].title}`} title={`Previous: ${reels[previousIndex].title}`}><IconTrack /></button>
            <button type="button" className="rp-btn" onClick={() => (ended ? replay() : togglePlay(false))} aria-label={ended ? "Replay" : paused ? "Play" : "Pause"}>
              {ended ? <IconReplay /> : paused ? <IconPlay /> : <IconPause />}
            </button>
            <button type="button" className="rp-btn" onClick={() => selectFilm(nextIndex)} aria-label={`Next: ${nextFilm.title}`} title={`Next: ${nextFilm.title}`}><IconTrack next /></button>
            <button type="button" className="rp-btn rp-btn--skip" onClick={() => seekBy(-SKIP)} aria-label={`Back ${SKIP} seconds`}><IconSkip /></button>
            <button type="button" className="rp-btn rp-btn--skip" onClick={() => seekBy(SKIP)} aria-label={`Forward ${SKIP} seconds`}><IconSkip forward /></button>

            <div className="rp-volume">
              <button type="button" className="rp-btn" onClick={toggleMute} aria-label={muted || volume === 0 ? "Unmute" : "Mute"} aria-pressed={muted || volume === 0}><IconVolume level={volumeLevel} /></button>
              <input
                className="rp-volume-range"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volumeLevel}
                aria-label="Volume"
                style={{ "--v": volumeLevel } as CSSProperties}
                onChange={(event) => changeVolume(Number(event.target.value))}
              />
            </div>

            <div className="rp-time">
              <span className="rp-time-now">{formatTime(time)}</span>
              <span className="rp-time-total">/ {formatTime(duration)}</span>
              <span className="rp-time-chapter">{chapter.title}</span>
            </div>

            <div className="rp-bar-end">
              <button
                type="button"
                className="rp-btn rp-menu-toggle"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="Playback settings"
                aria-expanded={menuOpen}
              >
                <IconSettings />
                <span className="rp-badge">{source.height >= 2160 ? "4K" : "HD"}</span>
              </button>
              {pipSupported && <button type="button" className="rp-btn rp-btn--pip" onClick={togglePip} aria-label="Picture in picture"><IconPip /></button>}
              <button type="button" className="rp-btn" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} aria-pressed={fullscreen}><IconFullscreen active={fullscreen} /></button>
            </div>
          </div>

        </div>
      </div>

      <div ref={rail} className="rp-chapters" role="group" aria-label="Chapters">
        {film.chapters.map((item, chapterNumber) => {
          const end = film.chapters[chapterNumber + 1]?.start ?? duration;
          const fill = chapterNumber < chapterIndex ? 1 : chapterNumber > chapterIndex ? 0 : clamp((time - item.start) / (end - item.start), 0, 1);
          return (
            <button
              key={item.start}
              type="button"
              className={`rp-chapter${chapterNumber === chapterIndex ? " is-active" : ""}`}
              style={{ flexGrow: end - item.start, "--c": fill } as CSSProperties}
              aria-current={chapterNumber === chapterIndex ? "true" : undefined}
              onClick={() => { seekTo(item.start); if (video.current?.paused) void video.current.play().catch(() => setBlocked(true)); }}
            >
              <span>{item.title}</span>
            </button>
          );
        })}
      </div>

      <section className="rp-queue-section" aria-labelledby="reel-up-next">
        <div className="rp-queue-head">
          <h3 id="reel-up-next">Up next</h3>
          <button type="button" className="rp-switch" role="switch" aria-checked={autoplayNext} onClick={toggleAutoplay}>
            <span>Autoplay</span><i aria-hidden="true" />
          </button>
        </div>
        <div className="rp-queue">
          {queue.map((item, position) => {
            const target = reels.indexOf(item);
            return (
              <button key={item.id} type="button" className="rp-card" onClick={() => selectFilm(target)} aria-label={`Play ${item.title}: ${item.tagline}, ${formatTime(item.duration)}`}>
                <span className="rp-card-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.thumb} alt="" loading="lazy" decoding="async" />
                  <span className="rp-card-time">{formatTime(item.duration)}</span>
                  <span className="rp-card-play" aria-hidden="true"><IconPlay /></span>
                </span>
                <span className="rp-card-meta">
                  {position === 0 && <span className="rp-card-next">Next</span>}
                  <strong>{item.title}<b>.</b></strong>
                  <span className="rp-card-tagline">{item.tagline}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <footer className="reel-footer">
        {"credit" in film && film.credit ? (
          <p className="reel-credit">
            Music: <a href={film.credit.href} target="_blank" rel="noreferrer">{film.credit.track}</a> by {film.credit.artist}, licensed under <a href={film.credit.licenseHref} target="_blank" rel="noreferrer">{film.credit.license}</a>
          </p>
        ) : null}
        <p className="reel-keys" aria-hidden="true"><kbd>Space</kbd> Play <kbd>←</kbd><kbd>→</kbd> {SKIP} seconds <kbd>N</kbd> Next <kbd>M</kbd> Mute <kbd>F</kbd> Fullscreen</p>
      </footer>
    </>
  );
}
