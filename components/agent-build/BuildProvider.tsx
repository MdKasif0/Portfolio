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
import { HWF_PRINT_SOFT } from "@/components/ui/halftone-wordmark-footer";
import { buildModeConfig } from "@/components/agent-build/buildMode.config";
import { BuildInspector } from "@/components/agent-build/BuildInspector";
import { ControlBar } from "@/components/agent-build/ControlBar";
import { CurtainSwarm, type SwarmHandoff } from "@/components/agent-build/CurtainSwarm";
import { compilePlan, type BuildPlan } from "@/components/agent-build/engine/compiler";
import { BuildEngine, type Activity } from "@/components/agent-build/engine/engine";
import { restoreClass } from "@/components/agent-build/engine/ghost";
import type { BuildPhase } from "@/components/agent-build/types";

type BuildContextValue = { replayBuild: () => void; phase: BuildPhase; buildWillRun: boolean };
const BuildContext = createContext<BuildContextValue | null>(null);

/** The control bar's agent tray (its avatar dots): where agents come from and go back to. */
function trayPoint() {
  const dots = document.querySelector(".agent-dot-cluster")?.getBoundingClientRect();
  return dots ? { x: dots.left + dots.width / 2, y: dots.top + dots.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight - 40 };
}

export function useAgentBuild() {
  const context = useContext(BuildContext);
  if (!context) throw new Error("useAgentBuild must be used within BuildProvider");
  return context;
}

type BuildProviderProps = {
  children: ReactNode;
  motionEnabled: boolean;
  scrollTo: (target: number, duration: number) => void;
  cancelScroll: () => void;
};

const isMobile = () => window.matchMedia("(max-width: 700px)").matches;
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Undo the compiler's hiding: every layer visible and interactive again. */
function restorePage(plan: BuildPlan | null) {
  try {
    plan?.nodes.forEach(({ el }) => {
      el.classList.remove("bm-hidden", "agent-layer-revealed", "ab-no-transition");
      if (el instanceof HTMLElement) el.inert = plan.inertBefore.get(el) ?? false;
      restoreClass(el);
    });
  } finally {
    document.querySelectorAll<HTMLElement>(".bm-hidden").forEach((element) => {
      element.classList.remove("bm-hidden");
      element.inert = false;
    });
    document.querySelectorAll("[data-ab-ghost], [data-ab-ghost-layer]").forEach((ghost) => ghost.remove());
  }
}

/** Director act shown in the control bar, from build progress. */
function actFor(progress: number) {
  if (progress < 0.02) return "scan";
  if (progress < 0.12) return "blueprint";
  if (progress < 0.62) return "build";
  if (progress < 0.85) return "polish";
  if (progress < 0.99) return "finale";
  return "handoff";
}

export function BuildProvider({ children, motionEnabled, scrollTo, cancelScroll }: BuildProviderProps) {
  const [phase, setPhase] = useState<BuildPhase>("idle");
  const [visible, setVisible] = useState(false);
  const [crew, setCrew] = useState(0);
  const [cameraMoving, setCameraMoving] = useState(false);
  const [finale, setFinale] = useState(false);
  const [bugs, setBugs] = useState(0);
  const [layersDone, setLayersDone] = useState(0);
  const [layersTotal, setLayersTotal] = useState(0);
  const [speed, setSpeed] = useState<number>(buildModeConfig.speedDefault);
  const [muted, setMuted] = useState<boolean>(!buildModeConfig.soundDefault);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [touring, setTouring] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  /** The intro's cursors stay on screen into the build until every one is handed to an agent. */
  const [introLive, setIntroLive] = useState(false);
  const [introRun, setIntroRun] = useState(0);
  const handoffRef = useRef<SwarmHandoff | null>(null);
  const planRef = useRef<BuildPlan | null>(null);
  const engineRef = useRef<BuildEngine | null>(null);
  const startedAtRef = useRef(0);
  const finishingAtRef = useRef(0);
  const takeoverRef = useRef(false);
  const touringRef = useRef(true);
  const phaseRef = useRef(phase);
  const scrollToRef = useRef(scrollTo);
  const cancelScrollRef = useRef(cancelScroll);
  const mutedRef = useRef(muted);
  // The build freezes and stays silent while the showreel is open, then carries on when it closes.
  const reelOpenRef = useRef(false);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const soundRef = useRef<AudioContext | null>(null);
  const lastSoundRef = useRef(0);
  const lastUiRef = useRef(0);
  const lastActivityRef = useRef(0);
  const finishTimerRef = useRef<number | null>(null);
  const hardCapRef = useRef<number | null>(null);

  phaseRef.current = phase;
  scrollToRef.current = scrollTo;
  cancelScrollRef.current = cancelScroll;
  mutedRef.current = muted;
  touringRef.current = touring;

  const cleanup = useCallback(() => {
    try {
      engineRef.current?.destroy();
    } finally {
      engineRef.current = null;
      restorePage(planRef.current);
      planRef.current = null;
      document.querySelector<HTMLElement>(".hwf")?.dispatchEvent(new CustomEvent("hwf:reveal", { detail: 1 }));
      setActivity(null);
    }
  }, []);

  const skipBuild = useCallback(() => {
    if (!planRef.current && (phaseRef.current === "idle" || phaseRef.current === "done" || phaseRef.current === "skipped")) {
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

  const playSound = useCallback(() => {
    if (mutedRef.current || reelOpenRef.current) return;
    const now = performance.now();
    if (now - lastSoundRef.current < 70) return;
    lastSoundRef.current = now;
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
  }, []);

  const endIntro = useCallback(() => setIntroLive(false), []);

  const startBuild = useCallback(() => {
    // The auto-start and replay timers can fire after the visitor already skipped from the curtain.
    if (phaseRef.current !== "scanning") return;
    if (!buildModeConfig.enabled || !motionEnabled || prefersReducedMotion()) {
      setPhase("skipped");
      setVisible(false);
      setAnnouncement("Site built, interactive now");
      return;
    }
    try {
      const plan = compilePlan();
      planRef.current = plan;
      setLayersTotal(plan.total);
      setLayersDone(0);
      setCrew(buildModeConfig.agents.rosterStart);
      setFinale(false);
      setBugs(0);
      setTouring(true);
      touringRef.current = true;
      takeoverRef.current = false;
      const engine = new BuildEngine({
        plan,
        mobile: isMobile(),
        debug: new URLSearchParams(window.location.search).get("buildDebug") === "1",
        printSoft: HWF_PRINT_SOFT,
        scrollTo: (target, duration) => scrollToRef.current(target, duration),
        isTouring: () => touringRef.current,
        spawnOrigin: (agentId) => handoffRef.current?.take(agentId) ?? trayPoint(),
        onProgress: (done) => {
          const now = performance.now();
          if (now - lastUiRef.current > 60 || done >= plan.total) {
            lastUiRef.current = now;
            setLayersDone(done);
            setElapsedMs(now - startedAtRef.current);
          }
        },
        goLiveButton: () => document.querySelector<HTMLElement>(".agent-control-bar .agent-go-live"),
        onCrew: (count) => setCrew(count),
        onCamera: (moving) => setCameraMoving(moving),
        onFinale: () => setFinale(true),
        onActivity: (next) => {
          const now = performance.now();
          if (now - lastActivityRef.current < 140) return;
          lastActivityRef.current = now;
          setActivity(next);
        },
        onLayerDone: playSound,
        onComplete: () => {
          finishingAtRef.current = performance.now();
          setBugs(engineRef.current?.metrics().violations ?? 0);
          setLayersDone(plan.total);
          setPhase("finishing");
        },
        onError: (error) => {
          console.error("Agent Build Mode failed; restoring the live page.", error);
          skipBuild();
        }
      });
      engine.setSpeed(reelOpenRef.current ? 0 : isMobile() ? buildModeConfig.mobileSpeedDefault : buildModeConfig.speedDefault);
      engineRef.current = engine;
      engine.start();
    } catch (error) {
      console.error("Agent Build Mode could not scan the page; restoring the live page.", error);
      skipBuild();
      return;
    }
    if (hardCapRef.current !== null) window.clearTimeout(hardCapRef.current);
    hardCapRef.current = window.setTimeout(() => skipBuild(), buildModeConfig.hardCapMs);
    startedAtRef.current = performance.now();
    setElapsedMs(0);
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
  }, [motionEnabled, playSound, skipBuild]);

  const replayBuild = useCallback(() => {
    if (!buildModeConfig.enabled || !motionEnabled || prefersReducedMotion()) return;
    cleanup();
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
    setSpeed(isMobile() ? buildModeConfig.mobileSpeedDefault : buildModeConfig.speedDefault);
    setMuted(!buildModeConfig.soundDefault);
    setPhase("scanning");
    setIntroLive(true);
    setIntroRun((run) => run + 1);
    setVisible(true);
    window.setTimeout(startBuild, buildModeConfig.autoStartMs);
  }, [cleanup, motionEnabled, startBuild]);

  const dismiss = useCallback(() => setVisible(false), []);
  /** Go live: during the finale (clicked by the lead agent, or the visitor) it flips the lights on. */
  const goLive = useCallback((event?: { currentTarget: HTMLElement }) => {
    const engine = engineRef.current;
    if (!engine) return;
    const rect = event?.currentTarget.getBoundingClientRect();
    engine.goLive(rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight - 40 });
  }, []);
  useEffect(() => {
    const onReel = (event: Event) => {
      const open = (event as CustomEvent<{ open: boolean }>).detail.open;
      reelOpenRef.current = open;
      engineRef.current?.setSpeed(open ? 0 : speedRef.current);
    };
    window.addEventListener("kasif:reel", onReel);
    return () => window.removeEventListener("kasif:reel", onReel);
  }, []);

  const cycleSpeed = useCallback(() => setSpeed((current) => current === 1 ? 2 : current === 2 ? 4 : 1), []);
  const toggleSound = useCallback(() => setMuted((current) => !current), []);

  useEffect(() => {
    engineRef.current?.setSpeed(reelOpenRef.current ? 0 : speed);
  }, [speed]);

  useEffect(() => {
    if (!buildModeConfig.enabled) return;
    // ?build=off shows the finished site straight away (also used to compare against the built page).
    if (!motionEnabled || prefersReducedMotion() || new URLSearchParams(window.location.search).get("build") === "off") {
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
    setSpeed(isMobile() ? buildModeConfig.mobileSpeedDefault : buildModeConfig.speedDefault);
    setPhase("scanning");
    setIntroLive(true);
    setIntroRun((run) => run + 1);
    setVisible(true);
    const timer = window.setTimeout(startBuild, buildModeConfig.autoStartMs);
    return () => window.clearTimeout(timer);
  }, [motionEnabled, startBuild]);

  useEffect(() => {
    if (!motionEnabled && phaseRef.current !== "idle" && phaseRef.current !== "done" && phaseRef.current !== "skipped") {
      skipBuild();
    }
  }, [motionEnabled, skipBuild]);

  // Visitor takeover: scrolling or clicking stops the tour (agents keep building what's in view).
  useEffect(() => {
    if (phase !== "building") return;
    const takeOver = (event: Event) => {
      if (!event.isTrusted) return;
      if (event.target instanceof Element && event.target.closest(".agent-control-bar")) return;
      // Stop the tour once; cancelling on every wheel tick would also cancel the visitor's own scroll.
      if (takeoverRef.current) return;
      takeoverRef.current = true;
      touringRef.current = false;
      setTouring(false);
      cancelScrollRef.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        skipBuild();
      } else {
        takeoverRef.current = true;
        touringRef.current = false;
        setTouring(false);
      }
    };
    window.addEventListener("wheel", takeOver, { passive: true });
    window.addEventListener("touchstart", takeOver, { passive: true });
    window.addEventListener("pointerdown", takeOver, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", takeOver);
      window.removeEventListener("touchstart", takeOver);
      window.removeEventListener("pointerdown", takeOver);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [phase, skipBuild]);

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
        setElapsedMs(Math.max(0, finishingAtRef.current - startedAtRef.current));
        finishTimerRef.current = window.setTimeout(() => setVisible(false), buildModeConfig.autoDismissMs);
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [cleanup, phase]);

  useEffect(() => () => {
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
    if (hardCapRef.current !== null) window.clearTimeout(hardCapRef.current);
    cleanup();
    if (soundRef.current) void soundRef.current.close();
  }, [cleanup]);

  useEffect(() => {
    window.__buildModeAudit = () => {
      const layers = Array.from(document.querySelectorAll<HTMLElement>("[data-layer]"));
      const hiddenLayers = layers.filter((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.opacity !== "1" || style.visibility !== "visible" || rect.width === 0 || rect.height === 0;
      }).length;
      const hiddenHeadings = Array.from(document.querySelectorAll<HTMLElement>("h1,h2")).filter((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.visibility !== "visible" || rect.width === 0 || rect.height === 0;
      }).length;
      const footer = document.querySelector<HTMLElement>(".hwf");
      const footerReady = footer?.dataset.hwfReady === "true";
      return { totalLayers: layers.length, hiddenLayers, hiddenHeadings, pass: hiddenLayers === 0 && hiddenHeadings === 0 && Boolean(footerReady) };
    };
    return () => { delete window.__buildModeAudit; };
  }, []);

  // Exposes the run state on <html> so page-level UI (the visitor cursor's "YOU" tag) can react.
  // done and skipped (also the error path, which calls skipBuild) clear it.
  useEffect(() => {
    const root = document.documentElement;
    if (phase === "building" || phase === "finishing") root.dataset.build = phase;
    else delete root.dataset.build;
  }, [phase]);
  useEffect(() => () => { delete document.documentElement.dataset.build; }, []);

  const contextValue = useMemo(() => ({ replayBuild, phase, buildWillRun: phase === "building" || phase === "scanning" || phase === "finishing" }), [phase, replayBuild]);
  const progress = layersTotal ? layersDone / layersTotal : 0;

  return (
    <BuildContext.Provider value={contextValue}>
      {children}
      {visible && (phase === "scanning" || (phase === "building" && introLive)) && (
        <div key={introRun} className={`agent-build-curtain${phase === "building" ? " is-handoff" : ""}`} aria-hidden="true">
          <CurtainSwarm durationMs={buildModeConfig.autoStartMs} building={phase === "building"} handoff={handoffRef} trayPoint={trayPoint} onDone={endIntro} />
        </div>
      )}
      {visible && phase === "building" && activity && <BuildInspector activity={activity} act={actFor(progress)} />}
      {visible && (
        <ControlBar
          phase={phase}
          agentCount={crew}
          finale={finale}
          bugs={bugs}
          cameraMoving={cameraMoving}
          onGoLive={goLive}
          layersDone={layersDone}
          layersTotal={layersTotal}
          speed={speed}
          muted={muted}
          touring={touring}
          elapsedMs={elapsedMs}
          directorAct={actFor(progress)}
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
