"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { buildModeConfig } from "@/components/agent-build/buildMode.config";
import { ControlBar } from "@/components/agent-build/ControlBar";
import { CursorLayer } from "@/components/agent-build/CursorLayer";
import { useBuildScript } from "@/components/agent-build/useBuildScript";
import type { BuildFrame, BuildLayer, BuildPhase, CursorPosition, LayerType } from "@/components/agent-build/types";

type BuildContextValue = { replayBuild: () => void };
const BuildContext = createContext<BuildContextValue | null>(null);

export function useAgentBuild() {
  const context = useContext(BuildContext);
  if (!context) throw new Error("useAgentBuild must be used within BuildProvider");
  return context;
}

type ElementSnapshot = {
  element: HTMLElement;
  inert: boolean;
};
type BuildProviderProps = {
  children: ReactNode;
  motionEnabled: boolean;
  scrollTo: (target: number, duration: number) => void;
  cancelScroll: () => void;
};

const sectionOrder = ["nav", "top", "work", "collaborators", "recognition", "raw-real", "about", "journey", "contact", "footer"];
const easeInOut = (value: number) => value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function layerType(value: string | undefined): LayerType {
  if (value === "image" || value === "button" || value === "card" || value === "line" || value === "icon") return value;
  return "text";
}

function collectLayers(): BuildLayer[] {
  const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-layer]"));
  const order = new Map(sectionOrder.map((section, index) => [section, index]));
  return elements
    .map((element, index) => {
      const bounds = element.getBoundingClientRect();
      const section = element.closest<HTMLElement>("header.site-nav") ? "nav"
        : element.closest<HTMLElement>("footer") ? "footer"
        : element.closest<HTMLElement>("section[id]")?.id
        ?? element.closest<HTMLElement>("[data-build-section]")?.dataset.buildSection
        ?? "page";
      const style = window.getComputedStyle(element);
      return {
        id: element.dataset.buildId || `${section}-${index}`,
        element,
        type: layerType(element.dataset.layer),
        kind: element.dataset.kind || element.dataset.layer || "text",
        section,
        index,
        text: (element.innerText || element.getAttribute("aria-label") || "").trim(),
        rect: {
          x: bounds.left + window.scrollX,
          y: bounds.top + window.scrollY,
          width: bounds.width,
          height: bounds.height
        },
        textStyle: {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
          color: style.color,
          textAlign: style.textAlign as BuildLayer["textStyle"]["textAlign"]
        }
      };
    })
    .sort((a, b) => {
      const sectionDifference = (order.get(a.section) ?? 99) - (order.get(b.section) ?? 99);
      return sectionDifference || a.index - b.index;
    })
    .map((layer, index) => ({ ...layer, index }));
}

function setHidden(elements: BuildLayer[], snapshots: ElementSnapshot[]) {
  elements.forEach(({ element }) => {
    snapshots.push({ element, inert: element.inert });
    element.classList.add("bm-hidden");
    element.inert = true;
  });
}

function restoreLayers(snapshots: ElementSnapshot[]) {
  let failed = false;
  try {
    for (const { element, inert } of snapshots) {
      try {
        element.classList.remove("bm-hidden", "agent-layer-revealed");
        element.inert = inert;
      } catch (error) {
        failed = true;
        console.error("Could not restore a Build Mode layer.", error);
      }
    }
  } finally {
    document.querySelectorAll<HTMLElement>(".bm-hidden").forEach((element) => element.classList.remove("bm-hidden"));
    snapshots.length = 0;
  }
  if (failed) console.error("Build Mode restored the remaining layers after a layer restoration error.");
}

function cursorCount() {
  return window.matchMedia("(max-width: 700px)").matches
    ? buildModeConfig.mobileAgentLimit
    : buildModeConfig.agentCountRange[1];
}

export function BuildProvider({ children, motionEnabled, scrollTo, cancelScroll }: BuildProviderProps) {
  const [phase, setPhase] = useState<BuildPhase>("idle");
  const [visible, setVisible] = useState(false);
  const [layers, setLayers] = useState<BuildLayer[]>([]);
  const [agentCount, setAgentCount] = useState<number>(buildModeConfig.agentCountRange[0]);
  const [cursorLimit, setCursorLimit] = useState<number>(buildModeConfig.agentCountRange[1]);
  const [layersDone, setLayersDone] = useState(0);
  const [speed, setSpeed] = useState<number>(buildModeConfig.speedDefault);
  const [muted, setMuted] = useState<boolean>(!buildModeConfig.soundDefault);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timelineProgress, setTimelineProgress] = useState(0);
  const [directorAct, setDirectorAct] = useState("scan");
  const [frame, setFrame] = useState<BuildFrame | null>(null);
  const [typedText, setTypedText] = useState("");
  const [positions, setPositions] = useState<CursorPosition[]>([]);
  const [touring, setTouring] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const layersRef = useRef<BuildLayer[]>([]);
  const cursorPositionsRef = useRef<CursorPosition[]>([]);
  const snapshotsRef = useRef<ElementSnapshot[]>([]);
  const revealedRef = useRef(new Set<string>());
  const startedAtRef = useRef(0);
  const timelineTimeRef = useRef(0);
  const lastTickAtRef = useRef(0);
  const finishingAtRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const lastUiUpdateRef = useRef(0);
  const lastTourSectionRef = useRef("");
  const takeoverRef = useRef(false);
  const phaseRef = useRef(phase);
  const scrollToRef = useRef(scrollTo);
  const cancelScrollRef = useRef(cancelScroll);
  const speedRef = useRef(speed);
  const soundRef = useRef<AudioContext | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const hardCapRef = useRef<number | null>(null);

  phaseRef.current = phase;
  scrollToRef.current = scrollTo;
  cancelScrollRef.current = cancelScroll;
  speedRef.current = speed;
  const script = useBuildScript(
    layers,
    cursorLimit,
    cursorLimit <= buildModeConfig.mobileAgentLimit
  );

  const cleanup = useCallback(() => {
    try {
      restoreLayers(snapshotsRef.current);
    } finally {
      revealedRef.current.clear();
      setFrame(null);
      setTypedText("");
      setPositions([]);
      cursorPositionsRef.current = [];
    }
  }, []);

  const skipBuild = useCallback(() => {
    if (
      snapshotsRef.current.length === 0
      && (phaseRef.current === "idle" || phaseRef.current === "done" || phaseRef.current === "skipped")
    ) {
      setVisible(false);
      return;
    }
    try {
      cancelScrollRef.current();
    } finally {
      cleanup();
      setPhase("skipped");
      setVisible(false);
      setAnnouncement("Site built, interactive now");
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
      if (hardCapRef.current !== null) window.clearTimeout(hardCapRef.current);
    }
  }, [cleanup]);

  const startBuild = useCallback(() => {
    if (!buildModeConfig.enabled || !motionEnabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("skipped");
      setVisible(false);
      setAnnouncement("Site built, interactive now");
      return;
    }
    try {
      const found = collectLayers();
      const activeLayers = found.length ? found : [];
      layersRef.current = activeLayers;
      setLayers(activeLayers);
      setAgentCount(buildModeConfig.agentCountRange[0]);
      setCursorLimit(cursorCount());
      setLayersDone(0);
      setTouring(true);
      takeoverRef.current = false;
      lastTourSectionRef.current = "";
      revealedRef.current.clear();
      setHidden(activeLayers, snapshotsRef.current);
    } catch (error) {
      console.error("Agent Build Mode could not scan the page; restoring the live page.", error);
      skipBuild();
      return;
    }
    if (hardCapRef.current !== null) window.clearTimeout(hardCapRef.current);
    hardCapRef.current = window.setTimeout(() => skipBuild(), 90_000);
    startedAtRef.current = performance.now();
    timelineTimeRef.current = 0;
    lastTickAtRef.current = startedAtRef.current;
    pausedAtRef.current = document.hidden ? performance.now() : null;
    setElapsedMs(0);
    setTimelineProgress(0);
    setDirectorAct("scan");
    setFrame(null);
    setPositions([]);
    cursorPositionsRef.current = [];
    setVisible(true);
    setPhase("building");
    setAnnouncement("");
    if (buildModeConfig.runOncePerSession) {
      try {
        window.sessionStorage.setItem(buildModeConfig.completionStorageKey, "started");
      } catch {
        // Session storage is optional; the current run remains functional.
      }
    }
  }, [motionEnabled, skipBuild]);

  const replayBuild = useCallback(() => {
    if (!buildModeConfig.enabled || !motionEnabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cleanup();
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
    setSpeed(window.matchMedia("(max-width: 700px)").matches ? buildModeConfig.mobileSpeedDefault : buildModeConfig.speedDefault);
    setMuted(!buildModeConfig.soundDefault);
    setPhase("scanning");
    setVisible(true);
    setAgentCount(buildModeConfig.agentCountRange[0]);
    setCursorLimit(cursorCount());
    window.setTimeout(startBuild, 180);
  }, [cleanup, motionEnabled, startBuild]);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeed((current) => current === 1 ? 2 : current === 2 ? 4 : 1);
  }, []);

  const playSound = useCallback(() => {
    if (muted) return;
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return;
    if (!soundRef.current) soundRef.current = new AudioContextConstructor();
    const context = soundRef.current;
    if (context.state === "suspended") void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 620;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.025, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.06);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.065);
  }, [muted]);

  const toggleSound = useCallback(() => {
    setMuted((current) => !current);
  }, []);

  const seekTimeline = useCallback((progress: number) => {
    if (phaseRef.current !== "building") return;
    const mobile = cursorLimit <= buildModeConfig.mobileAgentLimit;
    const duration = buildModeConfig.productionDurationMs * (mobile ? buildModeConfig.mobileTimeScale : 1);
    const targetTime = clamp(progress, 0, 1) * duration;
    if (targetTime < timelineTimeRef.current) {
      script.forEach((item) => {
        if (item.endsAt <= targetTime) return;
        if (revealedRef.current.delete(item.layer.id)) {
          item.layer.element.classList.add("bm-hidden");
          item.layer.element.inert = true;
        }
      });
    }
    timelineTimeRef.current = targetTime;
    lastTickAtRef.current = performance.now();
    setTimelineProgress(targetTime / duration);
  }, [cursorLimit, script]);

  useEffect(() => {
    if (!buildModeConfig.enabled) return;
    if (!motionEnabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("skipped");
      setVisible(false);
      return;
    }
    let alreadyRan = false;
    if (buildModeConfig.runOncePerSession) {
      try {
        alreadyRan = window.sessionStorage.getItem(buildModeConfig.completionStorageKey) !== null;
      } catch {
        alreadyRan = false;
      }
    }
    if (alreadyRan) return;

    const mobile = window.matchMedia("(max-width: 700px)").matches;
    setSpeed(mobile ? buildModeConfig.mobileSpeedDefault : buildModeConfig.speedDefault);
    setAgentCount(buildModeConfig.agentCountRange[0]);
    setCursorLimit(mobile ? buildModeConfig.mobileAgentLimit : buildModeConfig.agentCountRange[1]);
    setPhase("scanning");
    setVisible(true);
    const timer = window.setTimeout(startBuild, buildModeConfig.autoStartMs);
    return () => window.clearTimeout(timer);
  }, [motionEnabled, startBuild]);

  useEffect(() => {
    if (!motionEnabled && phaseRef.current !== "idle" && phaseRef.current !== "done" && phaseRef.current !== "skipped") {
      skipBuild();
    }
  }, [motionEnabled, skipBuild]);

  useEffect(() => {
    if (phase !== "building") return;
    const onVisibilityChange = () => {
      if (document.hidden) {
        pausedAtRef.current = performance.now();
      } else if (pausedAtRef.current !== null) {
        const resumedAt = performance.now();
        startedAtRef.current += resumedAt - pausedAtRef.current;
        lastTickAtRef.current = resumedAt;
        pausedAtRef.current = null;
      }
    };
    const takeOver = (event: Event) => {
      if (event.target instanceof Element && event.target.closest(".agent-control-bar")) return;
      takeoverRef.current = true;
      setTouring(false);
      cancelScrollRef.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        skipBuild();
      } else {
        takeoverRef.current = true;
        setTouring(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("wheel", takeOver, { passive: true });
    window.addEventListener("touchstart", takeOver, { passive: true });
    window.addEventListener("pointerdown", takeOver, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("wheel", takeOver);
      window.removeEventListener("touchstart", takeOver);
      window.removeEventListener("pointerdown", takeOver);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [phase, skipBuild]);

  useEffect(() => {
    if (phase !== "building" || script.length === 0) {
      if (phase === "building" && script.length === 0) {
        finishingAtRef.current = performance.now();
        setPhase("finishing");
      }
      return;
    }

    let raf = 0;
    let lastCursorUpdate = 0;
    let finishing = false;
    const tick = (now: number) => {
      try {
      if (document.hidden) return;
      const realElapsed = now - startedAtRef.current;
      timelineTimeRef.current += Math.max(0, now - lastTickAtRef.current) * speedRef.current;
      lastTickAtRef.current = now;
      const timelineTime = timelineTimeRef.current;
      let completed = 0;
      let activeFrame: BuildFrame | null = null;
      script.forEach((item) => {
        if (item.endsAt <= timelineTime) {
          if (!revealedRef.current.has(item.layer.id)) {
            revealedRef.current.add(item.layer.id);
            item.layer.element.classList.remove("bm-hidden");
            item.layer.element.inert = false;
            playSound();
          }
        } else if (item.startedAt <= timelineTime) {
          if (!activeFrame || item.startedAt >= activeFrame.startedAt) activeFrame = item;
        }
        if (revealedRef.current.has(item.layer.id)) completed += 1;
      });

      const currentFrame = activeFrame as BuildFrame | null;
      if (currentFrame) {
        const progress = clamp((timelineTime - currentFrame.startedAt) / Math.max(1, currentFrame.endsAt - currentFrame.startedAt), 0, 1);
        const text = currentFrame.layer.text;
        if (currentFrame.layer.type === "text" && text) {
          if (/display-title|hero-name|headline/i.test(currentFrame.layer.element.className)) {
            const words = text.split(/\s+/);
            setTypedText(words.slice(0, Math.max(1, Math.ceil(words.length * progress))).join(" "));
          } else {
            setTypedText(text.slice(0, Math.min(text.length, Math.ceil(progress * Math.min(text.length, 32)))));
          }
        } else {
          setTypedText("");
        }
      } else {
        setTypedText("");
      }

      if (now - lastUiUpdateRef.current > 80) {
        lastUiUpdateRef.current = now;
        setLayersDone(completed);
        setElapsedMs(realElapsed);
        setTimelineProgress(timelineTime / (buildModeConfig.productionDurationMs
          * (cursorLimit <= buildModeConfig.mobileAgentLimit ? buildModeConfig.mobileTimeScale : 1)));
        setAgentCount(
          Math.round(buildModeConfig.agentCountRange[0]
            + (buildModeConfig.agentCountRange[1] - buildModeConfig.agentCountRange[0])
            * clamp(timelineTime / (buildModeConfig.productionDurationMs * (cursorLimit <= buildModeConfig.mobileAgentLimit ? buildModeConfig.mobileTimeScale : 1)), 0, 1))
        );
        setDirectorAct(currentFrame?.act ?? directorActAt(timelineTime, cursorLimit <= buildModeConfig.mobileAgentLimit));
        setFrame(currentFrame);
      }

      if (touring && currentFrame && currentFrame.layer.section !== lastTourSectionRef.current) {
        lastTourSectionRef.current = currentFrame.layer.section;
        const section = document.getElementById(currentFrame.layer.section)
          ?? document.querySelector<HTMLElement>(`[data-build-section="${currentFrame.layer.section}"]`)
          ?? (currentFrame.layer.section === "nav" ? document.querySelector<HTMLElement>("header.site-nav") : null)
          ?? (currentFrame.layer.section === "footer" ? document.querySelector<HTMLElement>("footer") : null);
        if (section) {
          const sectionTop = section.getBoundingClientRect().top + window.scrollY;
          const target = Math.max(0, sectionTop + section.offsetHeight / 2 - window.innerHeight / 2);
          const duration = 1.4 + (hashForSection(currentFrame.layer.section) % 9) / 10;
          scrollToRef.current(target, duration);
        }
      }

      if (now - lastCursorUpdate >= 1000 / buildModeConfig.frameRateCap) {
        const cursorDelta = lastCursorUpdate ? now - lastCursorUpdate : 1000 / buildModeConfig.frameRateCap;
        lastCursorUpdate = now;
        const destinations = createCursorPositions(script, timelineTime, cursorLimit, window.scrollY);
        const nextPositions = applyCursorPhysics(destinations, cursorPositionsRef.current, cursorDelta);
        cursorPositionsRef.current = nextPositions;
        setPositions(nextPositions);
      }

      const lastEnd = script[script.length - 1].endsAt;
      if (completed === script.length && timelineTime >= lastEnd + 120 && !finishing) {
        finishing = true;
        finishingAtRef.current = now;
        setFrame(null);
        setPhase("finishing");
        return;
      }
      raf = window.requestAnimationFrame(tick);
      } catch (error) {
        console.error("Agent Build Mode failed; restoring the live page.", error);
        skipBuild();
      } finally {
        if (document.hidden && raf) {
          window.cancelAnimationFrame(raf);
          raf = 0;
        }
      }
    };
    const handleVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(raf);
        raf = 0;
        return;
      }
      lastTickAtRef.current = performance.now();
      lastCursorUpdate = 0;
      raf = window.requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    raf = window.requestAnimationFrame(tick);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.cancelAnimationFrame(raf);
    };
  }, [cursorLimit, phase, playSound, script, touring, skipBuild]);

  useEffect(() => {
    if (phase !== "finishing") return;
    const timer = window.setTimeout(() => {
      try {
        if (buildModeConfig.runOncePerSession) {
          window.sessionStorage.setItem(buildModeConfig.completionStorageKey, "complete");
        }
        if (!takeoverRef.current) scrollToRef.current(0, 1.6);
      } catch (error) {
        console.error("Agent Build Mode could not complete its handoff.", error);
      } finally {
        cleanup();
        if (hardCapRef.current !== null) window.clearTimeout(hardCapRef.current);
        setPhase("done");
        setAnnouncement("Site built, interactive now");
        setLayersDone(layersRef.current.length);
        setAgentCount(buildModeConfig.agentCountRange[1]);
        setElapsedMs(Math.max(0, finishingAtRef.current - startedAtRef.current));
        finishTimerRef.current = window.setTimeout(() => setVisible(false), buildModeConfig.autoDismissMs);
      }
    }, 850);
    return () => window.clearTimeout(timer);
  }, [cleanup, phase]);

  useEffect(() => () => {
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
    if (hardCapRef.current !== null) window.clearTimeout(hardCapRef.current);
    try {
      cleanup();
    } finally {
      document.querySelectorAll<HTMLElement>(".bm-hidden").forEach((element) => {
        element.classList.remove("bm-hidden");
        element.inert = false;
      });
    }
    if (soundRef.current) void soundRef.current.close();
  }, [cleanup]);

  useEffect(() => {
    window.__buildModeAudit = () => {
      const hidden = document.querySelectorAll(".bm-hidden").length;
      if (hidden) throw new Error(`Build Mode audit failed: ${hidden} hidden layer(s) remain.`);
      return true;
    };
    return () => { delete window.__buildModeAudit; };
  }, []);

  useEffect(() => {
    if (phase !== "building" || muted) return;
    playSound();
  }, [phase, muted, playSound]);

  const contextValue = useMemo(() => ({ replayBuild }), [replayBuild]);

  return (
    <BuildContext.Provider value={contextValue}>
      {children}
      {visible && phase === "scanning" && (
        <div className="agent-build-curtain" aria-hidden="true">
          <span className="agent-curtain-mark">K</span>
          <span className="agent-curtain-cursors"><i /><i /><i /><i /></span>
        </div>
      )}
      <CursorLayer
        visible={visible && (phase === "building" || phase === "finishing")}
        positions={positions}
        frame={frame}
        typedText={typedText}
        finishing={phase === "finishing"}
        speed={speed}
      />
      {visible && (
        <ControlBar
          phase={phase}
          agentCount={agentCount}
          layersDone={layersDone}
          layersTotal={layers.length}
          speed={speed}
          muted={muted}
          touring={touring}
          elapsedMs={elapsedMs}
          directorAct={directorAct}
          debug={buildModeConfig.debugTimeline}
          timelineProgress={timelineProgress}
          onSeek={seekTimeline}
          onStart={startBuild}
          onSkip={skipBuild}
          onDismiss={dismiss}
          onReplay={replayBuild}
          onCycleSpeed={cycleSpeed}
          onToggleSound={toggleSound}
        />
      )}
      <p className="agent-build-live" aria-live="polite" aria-atomic="true">{announcement}</p>
    </BuildContext.Provider>
  );
}

function directorActAt(time: number, mobile: boolean) {
  const scale = mobile ? buildModeConfig.mobileTimeScale : 1;
  if (time < 1_500 * scale) return "scan";
  if (time < 6_650 * scale) return "blueprint";
  if (time < 23_400 * scale) return "build";
  if (time < 30_900 * scale) return "polish";
  if (time < 34_900 * scale) return "finale";
  return "handoff";
}

function hashForSection(section: string) {
  return section.split("").reduce((value, char) => value + char.charCodeAt(0), 0);
}

function applyCursorPhysics(
  destinations: CursorPosition[],
  previous: CursorPosition[],
  deltaMs: number
): CursorPosition[] {
  const response = 1 - (1 - buildModeConfig.cursorSpring) ** (deltaMs / (1000 / 60));
  const sprung = destinations.map((target, index) => {
    const origin = previous[index];
    if (!origin || !target.active || !origin.active) return target;
    return {
      ...target,
      x: origin.x + (target.x - origin.x) * response,
      y: origin.y + (target.y - origin.y) * response
    };
  });
  return sprung.map((position, index) => {
    if (!position.active) return position;
    let repelX = 0;
    let repelY = 0;
    for (let otherIndex = 0; otherIndex < sprung.length; otherIndex += 1) {
      if (otherIndex === index || !sprung[otherIndex].active) continue;
      const dx = position.x - sprung[otherIndex].x;
      const dy = position.y - sprung[otherIndex].y;
      const distance = Math.hypot(dx, dy);
      if (distance >= 26) continue;
      const angle = distance > 0.1 ? Math.atan2(dy, dx) : ((index + 1) * Math.PI) / 4;
      const amount = (26 - distance) * 0.045;
      repelX += Math.cos(angle) * amount;
      repelY += Math.sin(angle) * amount;
    }
    return { ...position, x: position.x + repelX, y: position.y + repelY };
  });
}

function createCursorPositions(frames: BuildFrame[], time: number, count: number, scrollY: number): CursorPosition[] {
  const positions: CursorPosition[] = [];
  const byCursor = Array.from({ length: count }, () => [] as BuildFrame[]);
  frames.forEach((frame) => byCursor[frame.cursorId]?.push(frame));
  for (let cursorId = 0; cursorId < count; cursorId += 1) {
    const ownFrames = byCursor[cursorId];
    let currentIndex = -1;
    for (let index = 0; index < ownFrames.length; index += 1) {
      if (ownFrames[index].startedAt <= time) currentIndex = index;
      else break;
    }
    if (currentIndex < 0) {
      positions.push({ x: window.innerWidth / 2, y: window.innerHeight / 2, active: false });
      continue;
    }
    const current = ownFrames[currentIndex];
    const previous = ownFrames[Math.max(0, currentIndex - 1)];
    const currentX = current.layer.rect.x + current.layer.rect.width / 2;
    const currentY = current.layer.rect.y + current.layer.rect.height / 2 - scrollY;
    const previousX = currentIndex > 0 ? previous.layer.rect.x + previous.layer.rect.width / 2 : window.innerWidth / 2;
    const previousY = currentIndex > 0 ? previous.layer.rect.y + previous.layer.rect.height / 2 - scrollY : window.innerHeight / 2;
    const progress = easeInOut(clamp((time - current.startedAt) / Math.max(1, current.endsAt - current.startedAt), 0, 1));
    const lift = Math.min(110, Math.abs(currentX - previousX) * 0.16 + 30);
    const control1X = previousX + (currentX - previousX) * 0.32;
    const control2X = currentX - (currentX - previousX) * 0.16;
    const control1Y = previousY - lift;
    const control2Y = currentY - lift * 0.45;
    const inverse = 1 - progress;
    const x = inverse ** 3 * previousX + 3 * inverse ** 2 * progress * control1X + 3 * inverse * progress ** 2 * control2X + progress ** 3 * currentX;
    const y = inverse ** 3 * previousY + 3 * inverse ** 2 * progress * control1Y + 3 * inverse * progress ** 2 * control2Y + progress ** 3 * currentY;
    positions.push({
      x,
      y,
      active: time >= current.startedAt && time <= current.endsAt,
      section: current.layer.section,
      cue: current.cue
    });
  }
  return positions;
}
