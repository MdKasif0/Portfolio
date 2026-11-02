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
import { BuildDebugPanel } from "@/components/agent-build/BuildDebugPanel";
import { ControlBar } from "@/components/agent-build/ControlBar";
import { CursorLayer } from "@/components/agent-build/CursorLayer";
import { LayerProgressPanel } from "@/components/agent-build/LayerProgressPanel";
import { useBuildScript } from "@/components/agent-build/useBuildScript";
import { getActionAt, getActionProgress, getBuildMetrics, getTypedText } from "@/components/agent-build/taskCompiler";
import type { BuildAction, BuildDebugMetrics, BuildFrame, BuildLayer, BuildPhase, CursorPosition, LayerType } from "@/components/agent-build/types";

type BuildContextValue = { replayBuild: () => void };
const BuildContext = createContext<BuildContextValue | null>(null);

declare global {
  interface Window {
    __buildModeAudit?: () => { ok: boolean; hiddenCount: number; hiddenElements: string[] };
  }
}

export function useAgentBuild() {
  const context = useContext(BuildContext);
  if (!context) throw new Error("useAgentBuild must be used within BuildProvider");
  return context;
}

type ElementSnapshot = {
  element: HTMLElement;
  hadHiddenImageClass: boolean;
  hadReadyClass: boolean;
  hadRevealedClass: boolean;
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
  const ids = new Map<HTMLElement, string>();
  elements.forEach((element, index) => {
    const section = element.closest<HTMLElement>("header.site-nav") ? "nav"
      : element.closest<HTMLElement>("footer") ? "footer"
      : element.closest<HTMLElement>("section[id]")?.id
      ?? element.closest<HTMLElement>("[data-build-section]")?.dataset.buildSection
      ?? "page";
    ids.set(element, element.dataset.buildId || `${section}-${index}`);
  });
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
      const parentElement = element.parentElement?.closest<HTMLElement>("[data-layer]") ?? null;
      let depth = 0;
      let ancestor = parentElement;
      while (ancestor) {
        depth += 1;
        ancestor = ancestor.parentElement?.closest<HTMLElement>("[data-layer]") ?? null;
      }
      const image = element.matches("img") ? element as HTMLImageElement : element.querySelector<HTMLImageElement>("img");
      const backgroundImage = style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1] ?? "";
      return {
        id: ids.get(element) ?? `${section}-${index}`,
        element,
        type: layerType(element.dataset.layer),
        section,
        windowId: 0,
        index,
        parentId: parentElement ? ids.get(parentElement) ?? null : null,
        depth,
        text: (element.innerText || element.getAttribute("aria-label") || "").trim(),
        imageSrc: image?.currentSrc || image?.src || backgroundImage,
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
          textAlign: style.textAlign as BuildLayer["textStyle"]["textAlign"],
          borderRadius: style.borderRadius,
          backgroundColor: style.backgroundColor,
          backgroundImage: style.backgroundImage,
          border: style.border,
          objectFit: image ? window.getComputedStyle(image).objectFit : "cover"
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
    snapshots.push({
      element,
      hadHiddenImageClass: element.classList.contains("agent-layer-hidden-image"),
      hadReadyClass: element.classList.contains("agent-build-ready"),
      hadRevealedClass: element.classList.contains("agent-layer-revealed"),
      inert: element.inert
    });
    element.classList.add("bm-hidden");
    element.classList.add("agent-build-ready");
    if (element.dataset.layer === "image" || element.dataset.layer === "card") {
      element.classList.add("agent-layer-hidden-image");
    }
    element.inert = true;
  });
}

function restoreLayers(snapshots: ElementSnapshot[]) {
  snapshots.forEach(({ element, hadHiddenImageClass, hadReadyClass, hadRevealedClass, inert }) => {
    element.classList.remove("bm-hidden");
    if (!hadHiddenImageClass) element.classList.remove("agent-layer-hidden-image");
    if (!hadReadyClass) element.classList.remove("agent-build-ready");
    if (!hadRevealedClass) element.classList.remove("agent-layer-revealed");
    element.inert = inert;
  });
  snapshots.length = 0;
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
  const [scannedLayerCount, setScannedLayerCount] = useState(0);
  const [agentCount, setAgentCount] = useState<number>(buildModeConfig.agentCountRange[0]);
  const [cursorLimit, setCursorLimit] = useState<number>(buildModeConfig.agentCountRange[1]);
  const [layersDone, setLayersDone] = useState(0);
  const [speed, setSpeed] = useState<number>(buildModeConfig.speedDefault);
  const [muted, setMuted] = useState<boolean>(buildModeConfig.soundDefault);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timelineProgress, setTimelineProgress] = useState(0);
  const [directorAct, setDirectorAct] = useState("scan");
  const [frames, setFrames] = useState<BuildFrame[]>([]);
  const [positions, setPositions] = useState<CursorPosition[]>([]);
  const [qualityLimited, setQualityLimited] = useState(false);
  const [completedLayerNames, setCompletedLayerNames] = useState<string[]>([]);
  const completedNamesRef = useRef<string[]>([]);
  const [touring, setTouring] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debugMetrics, setDebugMetrics] = useState<BuildDebugMetrics>({
    workRatio: 100,
    longestGap: 0,
    violations: 0,
    activeActions: [],
    workerCount: 0,
    progress: 0,
    plannedDurationMs: 0,
    violatingAgentIds: [],
    actionCounts: {},
    activeWindow: 0,
    windowCount: 0,
    sampledFrames: 0
  });
  const reportedIdleViolationsRef = useRef(new Set<number>());
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
  const lastRuntimeSampleAtRef = useRef(0);
  const runtimeSampleRef = useRef({
    busy: 0,
    capacity: 0,
    longestGap: 0,
    longestEmptyGap: 0,
    emptyGapStartedAt: null as number | null,
    samples: 0
  });
  const runtimeLastActiveRef = useRef(new Map<number, number>());
  const runtimeWindowStatsRef = useRef(new Map<number, {
    samples: number;
    minCursors: number;
    maxCursors: number;
    middleSamples: number;
    middleMinCursors: number;
    middleMaxCursors: number;
    actionCounts: Partial<Record<BuildAction, number>>;
  }>());
  const runtimeActionCountsRef = useRef<Partial<Record<BuildAction, number>>>({});
  const lastSampledWindowRef = useRef<number | null>(null);
  const qualityOverBudgetRef = useRef(0);
  const lastTourWindowRef = useRef<number | null>(null);
  const lastTourScrollTargetRef = useRef<number | null>(null);
  const lastTourScrollAtRef = useRef(0);
  const takeoverRef = useRef(false);
  const phaseRef = useRef(phase);
  const scrollToRef = useRef(scrollTo);
  const cancelScrollRef = useRef(cancelScroll);
  const speedRef = useRef(speed);
  const soundRef = useRef<AudioContext | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const hardCapTimerRef = useRef<number | null>(null);

  phaseRef.current = phase;
  scrollToRef.current = scrollTo;
  cancelScrollRef.current = cancelScroll;
  speedRef.current = speed;
  const script = useBuildScript(
    layers,
    cursorLimit,
    cursorLimit <= buildModeConfig.mobileAgentLimit
  );
  const buildWindows = useMemo(() => Array.from(new Map(script.map((item) => [
    item.windowId,
    { id: item.windowId, start: item.windowStartedAt, end: item.windowEndsAt }
  ])).values()).sort((a, b) => a.start - b.start), [script]);
  const timelineDuration = Math.max(
    buildModeConfig.productionDurationMs * (cursorLimit <= buildModeConfig.mobileAgentLimit ? buildModeConfig.mobileTimeScale : 1),
    ...script.map((frame) => frame.endsAt)
  );

  useEffect(() => {
    setDebugEnabled(new URLSearchParams(window.location.search).get("buildDebug") === "1");
    setScannedLayerCount(document.querySelectorAll("[data-layer]").length);
  }, []);

  useEffect(() => {
    window.__buildModeAudit = () => {
      const hiddenElements = Array.from(document.querySelectorAll<HTMLElement>(".bm-hidden"));
      return {
        ok: hiddenElements.length === 0,
        hiddenCount: hiddenElements.length,
        hiddenElements: hiddenElements.map((element) =>
          element.dataset.layer ?? element.id ?? element.tagName.toLowerCase()
        )
      };
    };
    return () => {
      delete window.__buildModeAudit;
    };
  }, []);

  const resetDebugMetrics = useCallback(() => {
    setDebugMetrics({
      workRatio: 100,
      longestGap: 0,
      violations: 0,
      activeActions: [],
      workerCount: 0,
      progress: 0,
      plannedDurationMs: 0,
      violatingAgentIds: [],
      actionCounts: {},
      activeWindow: 0,
      windowCount: 0,
      sampledFrames: 0
    });
  }, []);

  const cleanup = useCallback(() => {
    try {
      restoreLayers(snapshotsRef.current);
    } finally {
      document.querySelectorAll<HTMLElement>(".bm-hidden, .agent-layer-hidden").forEach((element) => {
        element.classList.remove("bm-hidden", "agent-layer-hidden");
      });
      if (hardCapTimerRef.current !== null) {
        window.clearTimeout(hardCapTimerRef.current);
        hardCapTimerRef.current = null;
      }
      revealedRef.current.clear();
      setFrames([]);
      setPositions([]);
      setCompletedLayerNames([]);
      cursorPositionsRef.current = [];
      reportedIdleViolationsRef.current.clear();
    }
  }, []);

  const skipBuild = useCallback(() => {
    if (phaseRef.current === "idle" || phaseRef.current === "done" || phaseRef.current === "skipped") {
      try {
        cleanup();
      } finally {
        setVisible(false);
      }
      return;
    }
    try {
      cleanup();
    } finally {
      cancelScrollRef.current();
      setPhase("skipped");
      setVisible(false);
      setAnnouncement("Site built, interactive now");
      if (finishTimerRef.current !== null) {
        window.clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
    }
  }, [cleanup]);

  const failBuild = useCallback((reason: unknown) => {
    try {
      console.error("[Build Mode] Stopping the build and restoring the page.", reason);
    } finally {
      skipBuild();
    }
  }, [skipBuild]);

  const startBuild = useCallback(() => {
    if (!buildModeConfig.enabled || !motionEnabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("skipped");
      setVisible(false);
      setAnnouncement("Site built, interactive now");
      return;
    }
    const found = collectLayers();
    const activeLayers = found.length ? found : [];
    layersRef.current = activeLayers;
    setLayers(activeLayers);
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    setAgentCount(mobile ? buildModeConfig.mobileAgentLimit : buildModeConfig.agentCountRange[0]);
    setCursorLimit(cursorCount());
    setLayersDone(0);
    setTouring(true);
    takeoverRef.current = false;
    lastTourWindowRef.current = null;
    lastTourScrollTargetRef.current = null;
    lastTourScrollAtRef.current = 0;
    setCompletedLayerNames([]);
    setCompletedLayerNames([]);
    revealedRef.current.clear();
    completedNamesRef.current = [];
    try {
      setHidden(activeLayers, snapshotsRef.current);
    } catch (error) {
      failBuild(error);
      return;
    }
    startedAtRef.current = performance.now();
    timelineTimeRef.current = 0;
    lastTickAtRef.current = startedAtRef.current;
    pausedAtRef.current = document.hidden ? performance.now() : null;
    setElapsedMs(0);
    setTimelineProgress(0);
    resetDebugMetrics();
    runtimeSampleRef.current = {
      busy: 0,
      capacity: 0,
      longestGap: 0,
      longestEmptyGap: 0,
      emptyGapStartedAt: null,
      samples: 0
    };
    runtimeLastActiveRef.current.clear();
    runtimeWindowStatsRef.current.clear();
    runtimeActionCountsRef.current = {};
    lastSampledWindowRef.current = null;
    qualityOverBudgetRef.current = 0;
    setQualityLimited(false);
    lastRuntimeSampleAtRef.current = 0;
    setDirectorAct("scan");
    setFrames([]);
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
  }, [failBuild, motionEnabled, resetDebugMetrics]);

  const replayBuild = useCallback(() => {
    if (!buildModeConfig.enabled || !motionEnabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cleanup();
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
    setSpeed(window.matchMedia("(max-width: 700px)").matches ? buildModeConfig.mobileSpeedDefault : buildModeConfig.speedDefault);
    setMuted(buildModeConfig.soundDefault);
    resetDebugMetrics();
    setPhase("scanning");
    setVisible(true);
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    setAgentCount(mobile ? buildModeConfig.mobileAgentLimit : buildModeConfig.agentCountRange[0]);
    setCursorLimit(cursorCount());
    lastTourWindowRef.current = null;
    lastTourScrollTargetRef.current = null;
    lastTourScrollAtRef.current = 0;
    window.setTimeout(startBuild, 180);
  }, [cleanup, motionEnabled, resetDebugMetrics, startBuild]);

  const dismiss = useCallback(() => {
    if (phaseRef.current === "building" || phaseRef.current === "scanning" || phaseRef.current === "finishing") {
      skipBuild();
    } else {
      setVisible(false);
    }
  }, [skipBuild]);

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
    const targetTime = clamp(progress, 0, 1) * timelineDuration;
    if (targetTime < timelineTimeRef.current) {
      script.forEach((item) => {
        if (item.endsAt <= targetTime) return;
        if (revealedRef.current.delete(item.layer.id)) {
          item.layer.element.classList.add("bm-hidden");
          if (item.layer.type === "image" || item.layer.type === "card") {
            item.layer.element.classList.add("agent-layer-hidden-image");
          }
          item.layer.element.classList.remove("agent-layer-revealed");
          item.layer.element.inert = true;
        }
      });
    }
    timelineTimeRef.current = targetTime;
    lastTickAtRef.current = performance.now();
    setTimelineProgress(targetTime / timelineDuration);
  }, [script, timelineDuration]);

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
    setAgentCount(mobile ? buildModeConfig.mobileAgentLimit : buildModeConfig.agentCountRange[0]);
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
    const timer = window.setTimeout(
      () => failBuild(new Error(`Build Mode exceeded its ${buildModeConfig.maxBuildDurationMs}ms safety limit.`)),
      buildModeConfig.maxBuildDurationMs
    );
    hardCapTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (hardCapTimerRef.current === timer) hardCapTimerRef.current = null;
    };
  }, [failBuild, phase]);

  useEffect(() => {
    if (phase !== "building" && phase !== "scanning") return;
    const handleError = (event: ErrorEvent) => failBuild(event.error ?? new Error(event.message));
    const handleRejection = (event: PromiseRejectionEvent) => failBuild(event.reason);
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [failBuild, phase]);

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
    let lastCameraCheckAt = 0;
    let finishing = false;
    const tick = (now: number) => {
      if (document.hidden) return;
      const realElapsed = now - startedAtRef.current;
      const frameDuration = Math.max(0, now - lastTickAtRef.current);
      timelineTimeRef.current += frameDuration * speedRef.current;
      lastTickAtRef.current = now;
      if (frameDuration > buildModeConfig.qualityFrameBudgetMs) {
        qualityOverBudgetRef.current += 1;
        if (qualityOverBudgetRef.current >= 3) setQualityLimited(true);
      } else {
        qualityOverBudgetRef.current = Math.max(0, qualityOverBudgetRef.current - 1);
      }
      const timelineTime = timelineTimeRef.current;
      let completed = 0;
      script.forEach((item) => {
        if (item.endsAt <= timelineTime) {
          if (!revealedRef.current.has(item.layer.id)) {
            revealedRef.current.add(item.layer.id);
            completedNamesRef.current.push(item.layer.text.split("\n")[0]?.trim() || item.layer.id);
            item.layer.element.classList.remove("bm-hidden");
            item.layer.element.classList.remove("agent-layer-hidden-image");
            item.layer.element.classList.add("agent-layer-revealed");
            item.layer.element.inert = false;
            playSound();
          }
        }
        if (revealedRef.current.has(item.layer.id)) completed += 1;
      });

      const currentWindow = buildWindows.reduce((current, window) =>
        timelineTime >= window.start ? window : current, buildWindows[0]);
      const currentWindowId = currentWindow?.id ?? 0;
      const activeFrames = script
        .filter((item) => item.windowId === currentWindowId
          && timelineTime >= item.startedAt + item.travelDuration
          && timelineTime < item.endsAt)
        .map((item) => {
          const activeAction = getActionAt(item, timelineTime);
          const actionProgress = getActionProgress(item, timelineTime);
          const typeIndex = Math.max(item.recipe.indexOf("TYPE"), item.recipe.indexOf("RETYPE"));
          const activeIndex = item.recipe.indexOf(activeAction);
          const isTyping = activeAction === "TYPE" || activeAction === "RETYPE";
          return {
            ...item,
            activeAction,
            actionProgress,
            typedText: isTyping
              ? getTypedText(item.layer.text, actionProgress, item.seed)
              : activeAction === "COPY_PASTE" || (typeIndex >= 0 && activeIndex > typeIndex)
                ? item.layer.text
                : ""
          };
        });
      if (debugEnabled && now - lastRuntimeSampleAtRef.current >= 100) {
        lastRuntimeSampleAtRef.current = now;
        if (lastSampledWindowRef.current !== currentWindowId) {
          runtimeLastActiveRef.current.clear();
          lastSampledWindowRef.current = currentWindowId;
        }
        const windowTasks = script.filter((item) => item.windowId === currentWindowId);
        const workerIds = Array.from(new Set(windowTasks.map((item) => item.cursorId)));
        const activeWorkerIds = new Set(windowTasks
          .filter((item) => item.startedAt <= timelineTime && item.endsAt > timelineTime)
          .map((item) => item.cursorId));
        const visibleCursorCount = createCursorPositions(script, timelineTime, window.scrollY, currentWindowId, cursorLimit)
          .filter((position) => position.active).length;
        if (visibleCursorCount) {
          if (runtimeSampleRef.current.emptyGapStartedAt !== null) {
            runtimeSampleRef.current.longestEmptyGap = Math.max(
              runtimeSampleRef.current.longestEmptyGap,
              now - runtimeSampleRef.current.emptyGapStartedAt
            );
            runtimeSampleRef.current.emptyGapStartedAt = null;
          }
        } else {
          runtimeSampleRef.current.emptyGapStartedAt ??= now;
          runtimeSampleRef.current.longestEmptyGap = Math.max(
            runtimeSampleRef.current.longestEmptyGap,
            now - runtimeSampleRef.current.emptyGapStartedAt
          );
        }
        const workersInRange = workerIds.filter((workerId) => {
          const workerTasks = windowTasks.filter((item) => item.cursorId === workerId);
          const firstStart = Math.min(...workerTasks.map((item) => item.startedAt));
          const lastEnd = Math.max(...workerTasks.map((item) => item.endsAt));
          return timelineTime >= firstStart && timelineTime <= lastEnd;
        });
        runtimeSampleRef.current.samples += 1;
        runtimeSampleRef.current.busy += workersInRange.filter((id) => activeWorkerIds.has(id)).length;
        runtimeSampleRef.current.capacity += workersInRange.length;
        const windowStats = runtimeWindowStatsRef.current.get(currentWindowId) ?? {
          samples: 0,
          minCursors: Number.POSITIVE_INFINITY,
          maxCursors: 0,
          middleSamples: 0,
          middleMinCursors: Number.POSITIVE_INFINITY,
          middleMaxCursors: 0,
          actionCounts: {}
        };
        windowStats.samples += 1;
        windowStats.minCursors = Math.min(windowStats.minCursors, visibleCursorCount);
        windowStats.maxCursors = Math.max(windowStats.maxCursors, visibleCursorCount);
        const sampledWindow = buildWindows.find((item) => item.id === currentWindowId);
        const windowDuration = (sampledWindow?.end ?? 0) - (sampledWindow?.start ?? 0);
        const isMiddleSample = sampledWindow !== undefined
          && timelineTime >= sampledWindow.start + windowDuration * 0.15
          && timelineTime <= sampledWindow.end - windowDuration * 0.15;
        if (isMiddleSample) {
          windowStats.middleSamples += 1;
          windowStats.middleMinCursors = Math.min(windowStats.middleMinCursors, visibleCursorCount);
          windowStats.middleMaxCursors = Math.max(windowStats.middleMaxCursors, visibleCursorCount);
        }
        windowTasks.forEach((item) => {
          if (item.startedAt > timelineTime || item.endsAt <= timelineTime) return;
          const action = getActionAt(item, timelineTime);
          runtimeActionCountsRef.current[action] = (runtimeActionCountsRef.current[action] ?? 0) + 1;
          windowStats.actionCounts[action] = (windowStats.actionCounts[action] ?? 0) + 1;
        });
        runtimeWindowStatsRef.current.set(currentWindowId, windowStats);
        workerIds.forEach((workerId) => {
          const workerTasks = windowTasks.filter((item) => item.cursorId === workerId);
          const firstStart = Math.min(...workerTasks.map((item) => item.startedAt));
          const lastEnd = Math.max(...workerTasks.map((item) => item.endsAt));
          if (timelineTime < firstStart || timelineTime > lastEnd) return;
          if (activeWorkerIds.has(workerId)) {
            runtimeLastActiveRef.current.set(workerId, timelineTime);
            return;
          }
          const lastActiveAt = runtimeLastActiveRef.current.get(workerId);
          if (lastActiveAt !== undefined) {
            const gap = Math.max(0, timelineTime - lastActiveAt);
            runtimeSampleRef.current.longestGap = Math.max(runtimeSampleRef.current.longestGap, gap);
            if (gap > 250) reportedIdleViolationsRef.current.add(workerId);
          }
        });
      }
      const currentFrame = activeFrames.reduce<BuildFrame | null>((latest, item) =>
        !latest || item.startedAt > latest.startedAt ? item : latest, null);

      if (now - lastUiUpdateRef.current > 80) {
        lastUiUpdateRef.current = now;
        setLayersDone(completed);
        if (completedNamesRef.current.length) {
          setCompletedLayerNames((names) => [...completedNamesRef.current.splice(0), ...names].slice(0, 5));
        }
        setElapsedMs(realElapsed);
        setTimelineProgress(timelineTime / timelineDuration);
        setAgentCount(cursorLimit <= buildModeConfig.mobileAgentLimit
          ? buildModeConfig.mobileAgentLimit
          : Math.round(buildModeConfig.agentCountRange[0]
            + (buildModeConfig.agentCountRange[1] - buildModeConfig.agentCountRange[0])
            * clamp(timelineTime / timelineDuration, 0, 1)));
        setDirectorAct(currentFrame?.act ?? directorActAt(timelineTime, cursorLimit <= buildModeConfig.mobileAgentLimit));
        setFrames(activeFrames);
        if (debugEnabled) {
          const scheduledMetrics = getBuildMetrics(script, timelineTime, currentWindowId);
          const runtimeSamples = runtimeSampleRef.current;
          const nextMetrics = {
            ...scheduledMetrics,
            workRatio: runtimeSamples.capacity
              ? Math.min(100, runtimeSamples.busy / runtimeSamples.capacity * 100)
              : scheduledMetrics.workRatio,
            longestGap: Math.max(scheduledMetrics.longestGap, runtimeSamples.longestGap),
            violations: Math.max(scheduledMetrics.violations, reportedIdleViolationsRef.current.size),
            actionCounts: { ...runtimeActionCountsRef.current },
            sampledFrames: runtimeSamples.samples
          };
          setDebugMetrics(nextMetrics);
          nextMetrics.violatingAgentIds.forEach((agentId) => {
            if (reportedIdleViolationsRef.current.has(agentId)) return;
            reportedIdleViolationsRef.current.add(agentId);
            console.error(`[Agent Build Mode] Agent ${agentId + 1} was idle for more than 250ms.`);
          });
        }
      }

      if (touring && currentWindow && now - lastCameraCheckAt >= 250) {
        lastCameraCheckAt = now;
        const activeCameraTasks = script.filter((item) =>
          item.windowId === currentWindow.id
          && item.startedAt <= timelineTime
          && item.endsAt > timelineTime
        );
        const cameraTasks = activeCameraTasks.length ? activeCameraTasks : script.filter((item) =>
          item.windowId === currentWindow.id
          && item.startedAt <= timelineTime + buildModeConfig.cameraLookAheadMs
          && item.endsAt > timelineTime
        );
        const focusPoints = cameraTasks.map((item) => item.layer.rect.y + item.layer.rect.height / 2);
        const focusY = focusPoints.reduce((sum, point) => sum + point, 0) / Math.max(1, focusPoints.length);
        const navBottom = document.querySelector<HTMLElement>(".site-nav")?.getBoundingClientRect().bottom ?? 0;
        const controlTop = document.querySelector<HTMLElement>(".agent-control-bar")?.getBoundingClientRect().top
          ?? window.innerHeight - 80;
        const safeTop = Math.max(0, navBottom) + 20;
        const safeBottom = Math.min(window.innerHeight, controlTop) - 20;
        const viewportFocusY = (safeTop + Math.max(safeTop, safeBottom)) / 2;
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const target = clamp(focusY - viewportFocusY, 0, maxScroll);
        const isNewWindow = currentWindow.id !== lastTourWindowRef.current;
        const targetChanged = lastTourScrollTargetRef.current === null
          || Math.abs(target - lastTourScrollTargetRef.current) >= window.innerHeight * buildModeConfig.cameraRetargetThreshold;
        const cooldownElapsed = now - lastTourScrollAtRef.current >= buildModeConfig.cameraRetargetCooldownMs;
        if (isNewWindow || (targetChanged && cooldownElapsed)) {
          lastTourWindowRef.current = currentWindow.id;
          lastTourScrollTargetRef.current = target;
          lastTourScrollAtRef.current = now;
          const distanceInViewports = Math.abs(target - window.scrollY) / Math.max(1, window.innerHeight);
          const duration = clamp(1.4 + distanceInViewports * 0.2, 1.4, 2.2);
          scrollToRef.current(target, duration);
        }
      }

      if (now - lastCursorUpdate >= 1000 / buildModeConfig.frameRateCap) {
        lastCursorUpdate = now;
        const nextPositions = createCursorPositions(script, timelineTime, window.scrollY, currentWindowId, cursorLimit);
        cursorPositionsRef.current = nextPositions;
        setPositions(nextPositions);
      }

      const lastEnd = script.reduce((last, item) => Math.max(last, item.endsAt), 0);
      if (completed === script.length && timelineTime >= lastEnd + 450 && !finishing) {
        finishing = true;
        finishingAtRef.current = now;
        if (debugEnabled) {
          const runtimeSamples = runtimeSampleRef.current;
          console.info("[Agent Build Mode] 10Hz runtime report", {
            samples: runtimeSamples.samples,
            workRatio: runtimeSamples.capacity
              ? Number((runtimeSamples.busy / runtimeSamples.capacity * 100).toFixed(1))
              : 100,
            longestGapMs: Math.round(runtimeSamples.longestGap),
            longestEmptyGapMs: Math.round(runtimeSamples.longestEmptyGap),
            idleViolations: reportedIdleViolationsRef.current.size,
            actions: runtimeActionCountsRef.current,
            windows: Array.from(runtimeWindowStatsRef.current, ([windowId, stats]) => ({
              window: windowId + 1,
              samples: stats.samples,
              visibleCursorRange: [
                Number.isFinite(stats.middleMinCursors) ? stats.middleMinCursors : stats.minCursors,
                stats.middleSamples ? stats.middleMaxCursors : stats.maxCursors
              ],
              middleSamples: stats.middleSamples,
              sections: Array.from(new Set(script.filter((item) => item.windowId === windowId).map((item) => item.layer.section))),
              layerCount: script.filter((item) => item.windowId === windowId).length,
              plannedActions: script
                .filter((item) => item.windowId === windowId)
                .flatMap((item) => item.recipe)
                .reduce<Partial<Record<BuildAction, number>>>((counts, action) => {
                  counts[action] = (counts[action] ?? 0) + 1;
                  return counts;
                }, {}),
              sampledActions: stats.actionCounts
            }))
          });
        }
        setFrames([]);
        setPositions([]);
        setPhase("finishing");
        return;
      }
      raf = window.requestAnimationFrame(tick);
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
  }, [buildWindows, cursorLimit, debugEnabled, phase, playSound, script, timelineDuration, touring]);

  useEffect(() => {
    if (phase !== "finishing") return;
    const timer = window.setTimeout(() => {
      try {
        setPhase("done");
        setAnnouncement("Site built, interactive now");
        setLayersDone(layersRef.current.length);
        setAgentCount(cursorLimit <= buildModeConfig.mobileAgentLimit
          ? buildModeConfig.mobileAgentLimit
          : buildModeConfig.agentCountRange[1]);
        setElapsedMs(Math.max(0, finishingAtRef.current - startedAtRef.current));
        if (buildModeConfig.runOncePerSession) {
          try {
            window.sessionStorage.setItem(buildModeConfig.completionStorageKey, "complete");
          } catch {
            // Session storage is optional.
          }
        }
        if (!takeoverRef.current) scrollToRef.current(0, 1.6);
        finishTimerRef.current = window.setTimeout(() => setVisible(false), buildModeConfig.autoDismissMs);
      } finally {
        cleanup();
      }
    }, 850);
    return () => window.clearTimeout(timer);
  }, [cleanup, cursorLimit, phase]);

  useEffect(() => () => {
    try {
      cleanup();
    } finally {
      if (finishTimerRef.current !== null) {
        window.clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
      if (soundRef.current) void soundRef.current.close();
    }
  }, [cleanup]);

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
        frames={frames}
        qualityLimited={qualityLimited}
      />
      {debugEnabled && visible && phase === "building" && <BuildDebugPanel metrics={debugMetrics} />}
      <LayerProgressPanel
        names={completedLayerNames}
        visible={visible && (phase === "building" || phase === "finishing")}
      />
      {visible && (
        <ControlBar
          phase={phase}
          agentCount={agentCount}
          layersDone={layersDone}
          layersTotal={layers.length || scannedLayerCount}
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

function createCursorPositions(
  frames: BuildFrame[],
  time: number,
  scrollY: number,
  activeWindow: number,
  cursorLimit: number
): CursorPosition[] {
  const activeFrames = frames.filter((frame) => frame.windowId === activeWindow);
  const agentLimit = Math.min(cursorLimit, buildModeConfig.maxRenderedCursors);
  const minimumVisible = Math.min(8, agentLimit);
  const workerCount = Math.min(
    agentLimit,
    Math.max(minimumVisible, activeFrames.reduce((max, frame) => Math.max(max, frame.cursorId + 1), 0))
  );
  const queues = Array.from({ length: workerCount }, () => [] as BuildFrame[]);
  activeFrames.forEach((frame) => queues[frame.cursorId].push(frame));

  const positions: CursorPosition[] = queues.map((queue, cursorId): CursorPosition => {
    if (!queue.length) return { x: 0, y: 0, active: false, phase: "exit" as const };
    queue.sort((a, b) => a.startedAt - b.startedAt);
    const currentIndex = queue.findIndex((task) => time < task.endsAt);
    const frameIndex = currentIndex < 0 ? queue.length - 1 : currentIndex;
    const current = queue[frameIndex];
    if (!current || current.windowId !== activeWindow) {
      return { x: 0, y: 0, active: false, phase: "exit" };
    }

    const seed = current.seed ?? cursorId;
    const targetX = current.layer.rect.x + current.layer.rect.width / 2 + (seed % 15) - 7;
    const targetY = current.layer.rect.y + current.layer.rect.height / 2 - scrollY + (seed % 11) - 5;
    const previous = current.previousLayer ?? queue[frameIndex - 1]?.layer;
    const startX = previous ? previous.rect.x + previous.rect.width / 2 : (window.innerWidth / 2) + cursorId * 8;
    const startY = previous ? previous.rect.y + previous.rect.height / 2 - scrollY : window.innerHeight - 52;
    const travelEnd = current.startedAt + current.travelDuration;

    if (time < current.startedAt) {
      return {
        x: startX,
        y: startY,
        active: false,
        phase: "travel",
        section: current.layer.section,
        action: current.recipe[0],
        layerId: current.layer.id,
        violation: currentIndex > 0 && current.startedAt - queue[frameIndex - 1].endsAt > 250
      };
    }

    if (time < current.endsAt) {
      if (time < travelEnd) {
        const progress = easeInOut(clamp((time - current.startedAt) / current.travelDuration, 0, 1));
        const lift = Math.min(80, Math.abs(targetX - startX) * 0.1 + 18);
        const inverse = 1 - progress;
        const x = inverse ** 3 * startX
          + 3 * inverse ** 2 * progress * (startX + (targetX - startX) * 0.36)
          + 3 * inverse * progress ** 2 * (targetX - (targetX - startX) * 0.16)
          + progress ** 3 * targetX;
        const y = inverse ** 3 * startY
          + 3 * inverse ** 2 * progress * (startY - lift)
          + 3 * inverse * progress ** 2 * (targetY - lift * 0.4)
          + progress ** 3 * targetY;
        return {
          x, y, active: true, phase: "travel", section: current.layer.section,
          action: current.recipe[0], layerId: current.layer.id,
          violation: currentIndex > 0 && current.startedAt - queue[frameIndex - 1].endsAt > 250
        };
      }

      const actionProgress = getActionProgress(current, time);
      const hasNudge = seed % 100 < buildModeConfig.mistakeRate * 100;
      const nudge = hasNudge ? seed % 2 + 1 : undefined;
      const correction = nudge && actionProgress > 0.75 ? 0 : nudge ?? 0;
      return {
        x: targetX,
        y: targetY + correction,
        active: true,
        phase: "act",
        section: current.layer.section,
        action: getActionAt(current, time),
        layerId: current.layer.id,
        nudge: actionProgress > 0.75 ? undefined : nudge,
        violation: currentIndex > 0 && current.startedAt - queue[frameIndex - 1].endsAt > 250
      };
    }

    const exitDuration = 450;
    const progress = clamp((time - current.endsAt) / exitDuration, 0, 1);
    const distances = [targetX, window.innerWidth - targetX, targetY, window.innerHeight - targetY];
    const nearestEdge = distances.indexOf(Math.min(...distances));
    const edge = [
      { x: -24, y: targetY },
      { x: window.innerWidth + 24, y: targetY },
      { x: targetX, y: -28 },
      { x: targetX, y: window.innerHeight + 28 }
    ][nearestEdge];
    return {
      x: targetX + (edge.x - targetX) * easeInOut(progress),
      y: targetY + (edge.y - targetY) * easeInOut(progress),
      active: progress < 1,
      phase: "exit",
      section: current.layer.section,
      action: current.recipe[current.recipe.length - 1],
      layerId: current.layer.id
    };
  });

  let visibleCount = positions.filter((position) => position.active).length;
  const assistableLayerIds = new Set(activeFrames
    .filter((frame) => ["text", "button", "card"].includes(frame.layer.type) && frame.recipe.includes("TYPE"))
    .map((frame) => frame.layer.id));
  const assistedLayers = new Set<string>();
  positions.forEach((position) => {
    if (visibleCount >= minimumVisible || !position.active || !position.layerId
      || !assistableLayerIds.has(position.layerId) || assistedLayers.has(position.layerId)) return;
    const emptyIndex = positions.findIndex((candidate) => !candidate.active);
    if (emptyIndex < 0) return;
    const assistAction = position.action === "STYLE" ? "TYPE" : "STYLE";
    positions[emptyIndex] = {
      ...position,
      x: position.x + 19 + (emptyIndex % 3) * 5,
      y: position.y + 13 + (emptyIndex % 2) * 5,
      phase: "act",
      action: assistAction,
      nudge: undefined
    };
    assistedLayers.add(position.layerId);
    visibleCount += 1;
  });
  return positions;
}
