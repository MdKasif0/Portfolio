"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";
import { buildModeConfig, agentColors, agentNames } from "@/components/agent-build/buildMode.config";
import { BuildDebugPanel } from "@/components/agent-build/BuildDebugPanel";
import { ControlBar } from "@/components/agent-build/ControlBar";
import { CursorLayer } from "@/components/agent-build/CursorLayer";
import { LayerProgressPanel } from "@/components/agent-build/LayerProgressPanel";
import { useBuildScript } from "@/components/agent-build/useBuildScript";
import {
  getActionAt,
  getActionProgress,
  getBuildMetrics,
  getTypedText,
  createTestSceneLayers,
  createCursorPositions
} from "./taskCompiler";
import type {
  BuildAction,
  BuildDebugMetrics,
  BuildFrame,
  BuildLayer,
  BuildPhase,
  BuildTask,
  CursorPosition,
  LayerType
} from "@/components/agent-build/types";

type BuildContextValue = { replayBuild: () => void };
const BuildContext = createContext<BuildContextValue | null>(null);

export function useAgentBuild() {
  const context = useContext(BuildContext);
  if (!context) throw new Error("useAgentBuild must be used within BuildProvider");
  return context;
}

type ElementSnapshot = {
  element: HTMLElement;
  hadHiddenClass: boolean;
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

const sectionOrder = [
  "nav",
  "top",
  "work",
  "collaborators",
  "recognition",
  "raw-real",
  "about",
  "journey",
  "contact",
  "footer"
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function layerType(value: string | undefined): LayerType {
  if (value === "image" || value === "button" || value === "card" || value === "line" || value === "icon") {
    return value;
  }
  return "text";
}

function collectLayers(): BuildLayer[] {
  const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-layer]"));
  const ids = new Map<HTMLElement, string>();
  elements.forEach((element, index) => {
    const section =
      element.closest<HTMLElement>("header.site-nav")
        ? "nav"
        : element.closest<HTMLElement>("footer")
        ? "footer"
        : element.closest<HTMLElement>("section[id]")?.id ??
          element.closest<HTMLElement>("[data-build-section]")?.dataset.buildSection ??
          "page";
    ids.set(element, element.dataset.buildId || `${section}-${index}`);
  });

  const order = new Map(sectionOrder.map((section, index) => [section, index]));
  return elements
    .map((element, index) => {
      const bounds = element.getBoundingClientRect();
      const section =
        element.closest<HTMLElement>("header.site-nav")
          ? "nav"
          : element.closest<HTMLElement>("footer")
          ? "footer"
          : element.closest<HTMLElement>("section[id]")?.id ??
            element.closest<HTMLElement>("[data-build-section]")?.dataset.buildSection ??
            "page";
      const style = window.getComputedStyle(element);
      const parentElement = element.parentElement?.closest<HTMLElement>("[data-layer]") ?? null;
      let depth = 0;
      let ancestor = parentElement;
      while (ancestor) {
        depth += 1;
        ancestor = ancestor.parentElement?.closest<HTMLElement>("[data-layer]") ?? null;
      }
      const image = element.matches("img")
        ? (element as HTMLImageElement)
        : element.querySelector<HTMLImageElement>("img");
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
    if (!element || !element.classList) return;
    snapshots.push({
      element,
      hadHiddenClass: element.classList.contains("agent-layer-hidden"),
      hadHiddenImageClass: element.classList.contains("agent-layer-hidden-image"),
      hadReadyClass: element.classList.contains("agent-build-ready"),
      hadRevealedClass: element.classList.contains("agent-layer-revealed"),
      inert: element.inert
    });
    element.classList.add("agent-layer-hidden");
    element.classList.add("agent-build-ready");
    if (element.dataset.layer === "image" || element.dataset.layer === "card") {
      element.classList.add("agent-layer-hidden-image");
    }
    element.inert = true;
  });
}

function restoreLayers(snapshots: ElementSnapshot[]) {
  snapshots.forEach(({ element, hadHiddenClass, hadHiddenImageClass, hadReadyClass, hadRevealedClass, inert }) => {
    if (!element || !element.classList) return;
    if (!hadHiddenClass) element.classList.remove("agent-layer-hidden");
    if (!hadHiddenImageClass) element.classList.remove("agent-layer-hidden-image");
    if (!hadReadyClass) element.classList.remove("agent-build-ready");
    if (!hadRevealedClass) element.classList.remove("agent-layer-revealed");
    element.inert = inert;
  });
  snapshots.length = 0;
}

function cursorCount() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 700px)").matches
    ? buildModeConfig.mobileAgentLimit
    : buildModeConfig.maxRenderedCursors;
}

export function BuildProvider({ children, motionEnabled, scrollTo, cancelScroll }: BuildProviderProps) {
  const [phase, setPhase] = useState<BuildPhase>("idle");
  const [visible, setVisible] = useState(false);
  const [layers, setLayers] = useState<BuildLayer[]>([]);
  const [scannedLayerCount, setScannedLayerCount] = useState(0);
  const [agentCount, setAgentCount] = useState<number>(buildModeConfig.agentCountRange[0]);
  const [cursorLimit, setCursorLimit] = useState<number>(buildModeConfig.maxRenderedCursors);
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
  const [isTestScene, setIsTestScene] = useState(false);
  const [shockwave, setShockwave] = useState<{ x: number; y: number } | null>(null);
  const [lightsOn, setLightsOn] = useState(false);

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
    sampledFrames: 0,
    queueDepthDistribution: {}
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
  const qualityOverBudgetRef = useRef(0);
  const lastTourScrollTargetRef = useRef<number | null>(null);
  const takeoverRef = useRef(false);
  const phaseRef = useRef(phase);
  const scrollToRef = useRef(scrollTo);
  const cancelScrollRef = useRef(cancelScroll);
  const speedRef = useRef(speed);
  const soundRef = useRef<AudioContext | null>(null);
  const finishTimerRef = useRef<number | null>(null);

  phaseRef.current = phase;
  scrollToRef.current = scrollTo;
  cancelScrollRef.current = cancelScroll;
  speedRef.current = speed;

  const script = useBuildScript(
    layers,
    cursorLimit,
    cursorLimit <= buildModeConfig.mobileAgentLimit
  );

  const buildWindows = useMemo(
    () =>
      Array.from(
        new Map(
          script.map((item) => [
            item.windowId,
            { id: item.windowId, start: item.windowStartedAt, end: item.windowEndsAt }
          ])
        ).values()
      ).sort((a, b) => a.start - b.start),
    [script]
  );

  const timelineDuration = Math.max(
    buildModeConfig.productionDurationMs *
      (cursorLimit <= buildModeConfig.mobileAgentLimit ? buildModeConfig.mobileTimeScale : 1),
    ...script.map((frame) => frame.endsAt)
  );
  const buildEndTime = Math.max(1, ...buildWindows.map((window) => window.end));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    setDebugEnabled(searchParams.get("buildDebug") === "1");
    if (searchParams.get("testScene") === "1") {
      setIsTestScene(true);
    }
    setScannedLayerCount(document.querySelectorAll("[data-layer]").length);
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
      sampledFrames: 0,
      queueDepthDistribution: {}
    });
  }, []);

  const cleanup = useCallback(() => {
    restoreLayers(snapshotsRef.current);
    revealedRef.current.clear();
    setFrames([]);
    setPositions([]);
    setCompletedLayerNames([]);
    cursorPositionsRef.current = [];
    reportedIdleViolationsRef.current.clear();
  }, []);

  const skipBuild = useCallback(() => {
    if (phaseRef.current === "idle" || phaseRef.current === "done" || phaseRef.current === "skipped") {
      setVisible(false);
      return;
    }
    cleanup();
    cancelScrollRef.current();
    setPhase("skipped");
    setVisible(false);
    setAnnouncement("Site built, interactive now");
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
  }, [cleanup]);

  const startBuild = useCallback(() => {
    if (!buildModeConfig.enabled || !motionEnabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("skipped");
      setVisible(false);
      setAnnouncement("Site built, interactive now");
      return;
    }

    if (!isTestScene) scrollToRef.current(0, 0);
    const activeLayers = isTestScene ? createTestSceneLayers() : collectLayers();
    layersRef.current = activeLayers;
    setLayers(activeLayers);

    const mobile = window.matchMedia("(max-width: 700px)").matches;
    setAgentCount(mobile ? buildModeConfig.mobileAgentLimit : 12);
    setCursorLimit(cursorCount());
    setLayersDone(0);
    setTouring(true);
    takeoverRef.current = false;
    lastTourScrollTargetRef.current = null;
    setCompletedLayerNames([]);
    revealedRef.current.clear();
    completedNamesRef.current = [];

    if (!isTestScene) {
      setHidden(activeLayers, snapshotsRef.current);
    }

    startedAtRef.current = performance.now();
    timelineTimeRef.current = 0;
    lastTickAtRef.current = startedAtRef.current;
    pausedAtRef.current = document.hidden ? performance.now() : null;
    setElapsedMs(0);
    setTimelineProgress(0);
    resetDebugMetrics();

    qualityOverBudgetRef.current = 0;
    setQualityLimited(false);
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
        // Session storage is optional.
      }
    }
  }, [isTestScene, motionEnabled, resetDebugMetrics]);

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
    setAgentCount(mobile ? buildModeConfig.mobileAgentLimit : 12);
    setCursorLimit(cursorCount());
    lastTourScrollTargetRef.current = null;
    window.setTimeout(startBuild, buildModeConfig.autoStartMs);
  }, [cleanup, motionEnabled, resetDebugMetrics, startBuild]);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeed((current) => (current === 1 ? 2 : current === 2 ? 4 : 1));
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

  const seekTimeline = useCallback(
    (progress: number) => {
      if (phaseRef.current !== "building") return;
      const targetTime = clamp(progress, 0, 1) * timelineDuration;
      if (targetTime < timelineTimeRef.current) {
        script.forEach((item) => {
          if (item.endsAt <= targetTime) return;
          if (revealedRef.current.delete(item.layer.id)) {
            if (item.layer.element && item.layer.element.classList) {
              item.layer.element.classList.add("agent-layer-hidden");
              if (item.layer.type === "image" || item.layer.type === "card") {
                item.layer.element.classList.add("agent-layer-hidden-image");
              }
              item.layer.element.classList.remove("agent-layer-revealed");
              item.layer.element.inert = true;
            }
          }
        });
      }
      timelineTimeRef.current = targetTime;
      lastTickAtRef.current = performance.now();
      setTimelineProgress(targetTime / timelineDuration);
    },
    [script, timelineDuration]
  );

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
    setAgentCount(mobile ? buildModeConfig.mobileAgentLimit : 12);
    setCursorLimit(cursorCount());
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

  // Main RAF tick loop
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
            if (item.layer.element && item.layer.element.classList) {
              item.layer.element.classList.remove("agent-layer-hidden");
              item.layer.element.classList.remove("agent-layer-hidden-image");
              item.layer.element.classList.add("agent-layer-revealed");
              item.layer.element.inert = false;
            }
            playSound();
          }
        }
        if (revealedRef.current.has(item.layer.id)) completed += 1;
      });

      const currentWindow = buildWindows.reduce(
        (current, window) => (timelineTime >= window.start ? window : current),
        buildWindows[0]
      );
      const currentWindowId = currentWindow?.id ?? 0;

      const activeFrames = script
        .filter(
          (item) =>
            item.windowId === currentWindowId &&
            timelineTime >= item.startedAt &&
            timelineTime < item.endsAt
        )
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

      if (now - lastUiUpdateRef.current > 60) {
        lastUiUpdateRef.current = now;
        setLayersDone(completed);
        if (completedNamesRef.current.length) {
          setCompletedLayerNames((names) => [...completedNamesRef.current.splice(0), ...names].slice(0, 5));
        }
        setElapsedMs(realElapsed);
        setTimelineProgress(timelineTime / timelineDuration);

        // Agent counter ramps 18 -> 30 as building progresses
        const progressRatio = script.length ? Math.min(1, completed / script.length) : 0;
        const rampedAgents = Math.min(30, Math.max(18, Math.round(18 + progressRatio * 12)));
        setAgentCount(rampedAgents);

        setDirectorAct(directorActAt(timelineTime, cursorLimit <= buildModeConfig.mobileAgentLimit));
        setFrames(activeFrames);

        if (debugEnabled) {
          const scheduledMetrics = getBuildMetrics(script, timelineTime, currentWindowId);
          setDebugMetrics(scheduledMetrics);

          scheduledMetrics.violatingAgentIds.forEach((agentId) => {
            if (reportedIdleViolationsRef.current.has(agentId)) return;
            reportedIdleViolationsRef.current.add(agentId);
            console.error(`[Agent Build Mode] Dev Watchdog Alert: Agent ${agentId + 1} gap > 250ms.`);
          });
        }
      }

      if (touring && !isTestScene) {
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const timelineTarget = maxScroll * clamp(timelineTime / buildEndTime, 0, 1);
        const previousTarget = lastTourScrollTargetRef.current ?? 0;
        const target = Math.max(previousTarget, window.scrollY, timelineTarget);
        if (lastTourScrollTargetRef.current === null || target - previousTarget >= 1) {
          lastTourScrollTargetRef.current = target;
          scrollToRef.current(target, 0);
        }
      }

      if (now - lastCursorUpdate >= 1000 / buildModeConfig.frameRateCap) {
        lastCursorUpdate = now;
        const nextPositions = createCursorPositions(
          script,
          timelineTime,
          isTestScene ? 0 : window.scrollY,
          currentWindowId,
          cursorLimit
        );
        cursorPositionsRef.current = nextPositions;
        setPositions(nextPositions);
      }

      const lastEnd = script.reduce((last, item) => Math.max(last, item.endsAt), 0);
      if (completed === script.length && timelineTime >= lastEnd + 400 && !finishing) {
        finishing = true;
        finishingAtRef.current = now;
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
  }, [
    buildEndTime,
    buildWindows,
    cursorLimit,
    debugEnabled,
    isTestScene,
    phase,
    playSound,
    positions,
    script,
    timelineDuration,
    touring
  ]);

  useEffect(() => {
    if (phase !== "finishing") return;
    const buttonEl = document.querySelector<HTMLElement>(".agent-control-bar .agent-primary-button");
    const rect = buttonEl?.getBoundingClientRect();
    const clickX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const clickY = rect ? rect.top + rect.height / 2 : window.innerHeight - 35;

    setShockwave({ x: clickX, y: clickY });
    setLightsOn(true);
    playSound();

    const shockwaveTimer = window.setTimeout(() => {
      setShockwave(null);
      setLightsOn(false);
    }, 950);

    const finishTimer = window.setTimeout(() => {
      cleanup();
      setPhase("done");
      setAnnouncement("Site built, interactive now");
      setLayersDone(layersRef.current.length || 364);
      setElapsedMs(Math.max(0, finishingAtRef.current - startedAtRef.current));
      if (buildModeConfig.runOncePerSession) {
        try {
          window.sessionStorage.setItem(buildModeConfig.completionStorageKey, "complete");
        } catch {
          // Session storage is optional.
        }
      }
      finishTimerRef.current = window.setTimeout(() => setVisible(false), buildModeConfig.autoDismissMs);
    }, 850);

    return () => {
      window.clearTimeout(shockwaveTimer);
      window.clearTimeout(finishTimer);
    };
  }, [cleanup, isTestScene, phase, playSound]);

  useEffect(
    () => () => {
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
      cleanup();
      if (soundRef.current) void soundRef.current.close();
    },
    [cleanup]
  );

  useEffect(() => {
    if (phase !== "building" || muted) return;
    playSound();
  }, [phase, muted, playSound]);

  const contextValue = useMemo(() => ({ replayBuild }), [replayBuild]);

  return (
    <BuildContext.Provider value={contextValue}>
      {children}
      {visible && phase === "scanning" && (
        <div
          className="agent-build-curtain"
          style={{ "--cursor-intro-duration": `${buildModeConfig.autoStartMs}ms` } as CSSProperties}
          aria-hidden="true"
        >
          <span className="agent-curtain-mark">K</span>
          <span className="agent-curtain-cursors">
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
      )}
      {/* Finale Shockwave Ring & Lights On Flash */}
      {shockwave && (
        <div
          className="agent-shockwave-ring"
          style={{ left: shockwave.x, top: shockwave.y }}
          aria-hidden="true"
        />
      )}
      {lightsOn && <div className="agent-lights-on" aria-hidden="true" />}
      <CursorLayer
        visible={visible && (phase === "building" || phase === "finishing")}
        positions={positions}
        frames={frames}
        qualityLimited={qualityLimited}
      />
      {debugEnabled && visible && phase === "building" && (
        <BuildDebugPanel
          metrics={debugMetrics}
          isTestScene={isTestScene}
          onToggleTestScene={() => {
            setIsTestScene((prev) => !prev);
            replayBuild();
          }}
        />
      )}
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
      <p className="agent-build-live" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </BuildContext.Provider>
  );
}

function directorActAt(time: number, mobile: boolean) {
  const scale = mobile ? buildModeConfig.mobileTimeScale : 1;
  if (time < 9_000 * scale) return "hero";
  if (time < 17_000 * scale) return "work grid";
  if (time < 20_000 * scale) return "collab strip";
  if (time < 26_000 * scale) return "recognition";
  if (time < 30_000 * scale) return "raw → real";
  if (time < 36_000 * scale) return "about";
  if (time < 43_000 * scale) return "contact";
  return "finale";
}
