"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { AGENT_COLORS } from "@/components/agent-build/engine/agent";
import { FULL_STOP, SIGNATURE_STROKES, SIGNATURE_VIEWBOX, sampleAt, strokeOutline, strokeSlice, strokeTimeline } from "@/components/agent-build/signature";

/**
 * The opening shot before the build: a calligraphic "Kasif." signature is written in 1.5 seconds
 * (a red light streak runs ahead of a glowing pen that leaves white ink), DEVELOPER surfaces
 * beneath its closing flourish as the pen passes over each letter, and two loose groups of agent cursors circle it clockwise the whole time.
 *
 * The cursors move like hands on a mouse, not like a formation: they stay upright as real
 * pointers do, and each one travels in its own quick bursts, with a slight curve, a small
 * overshoot and correction, a short pause, and a little hand tremor.
 *
 * Handoff: as the build starts the cursors settle into the builder agents' colours and keep
 * circling; each new agent the engine spawns takes over one of them (`handoff.take`)
 * at its exact spot, then flies off to its first task. Cursors the engine never needs glide
 * into the control bar's agent tray. Cursors are drawn on one canvas.
 */

const PER_FLOCK = 9;
/** One full circle on average, ms. */
const ORBIT_MS = 3400;
/** Cursors ease into the agents' pose and colours over this long before the build starts. */
const SETTLE_MS = 700;
/** The signature and the dark curtain fade out over this long as the build starts. */
const FADE_MS = 500;
/** Unclaimed cursors head for the tray this long after the build starts, taking `TRAY_MS`. */
const TRAY_AFTER_MS = 1600;
const TRAY_MS = 520;
/** Where the lead cursor of the first flock is when the build starts (just past the right side). */
const HANDOFF_ANGLE = 0.1;
/** Same pointer as the engine's agents (viewBox 0 0 16 20). */
const CURSOR_PATH = "M1.5 1.2 14 11.3l-5.6.5-3 4.9L1.5 1.2Z";
/** The engine draws agents at 15×19 for the 16×20 pointer, so its tip sits this far inside. */
const AGENT_SCALE = 15 / 16;
const AGENT_TIP = { x: 1.5 * AGENT_SCALE, y: 1.2 * (19 / 20) };

export type SwarmHandoff = { take: (agentId: number) => { x: number; y: number } | null };

/** The signature's pen strokes take this long; the red full stop lands in the time left after them. */
const WRITE_MS = 1440;
const SIGNATURE_MS = 1500;
const TIMELINE = strokeTimeline(WRITE_MS);
/** The stroke that carries the closing flourish over DEVELOPER. */
const FLOURISH = 1;
/** DEVELOPER's letters never arrive closer together than this, so the word still reads as a sweep. */
const LETTER_MIN_GAP = 34;
/** How far the red streak runs ahead of the pen, in samples of the line. */
const STREAK_SAMPLES = 46;

/** One hand movement along the circle: a burst from `from` to `to` over t0..t1, then a pause until `rest`. */
type Flick = { t0: number; t1: number; rest: number; from: number; to: number; bow: number };
/** `id` is the builder agent this cursor becomes: the engine numbers its agents 0, 1, 2… */
type Cursor = { id: number; flock: number; index: number; color: string; jitter: number; reach: number; flicks: Flick[]; claimedAt: number | null };

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
/** The minimum-jerk profile of a practised hand movement: a smooth start, a fast middle, a soft stop. */
const reachProfile = (t: number) => t * t * t * (10 + t * (6 * t - 15));

/** The agent colour mixed toward white by `amount` (the intro's softer pastel look). */
function pastel(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

type Props = {
  /** When the build is planned to start (the curtain's auto-start). */
  durationMs: number;
  /** True once the build has started (planned or because the visitor pressed Start). */
  building: boolean;
  handoff: MutableRefObject<SwarmHandoff | null>;
  /** Where the control bar's agent tray is. */
  trayPoint: () => { x: number; y: number };
  /** Every cursor has been handed off or tucked into the tray. */
  onDone: () => void;
};

export function CurtainSwarm({ durationMs, building, handoff, trayPoint, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const buildingAt = useRef<number | null>(null);
  const callbacks = useRef({ trayPoint, onDone });
  callbacks.current = { trayPoint, onDone };
  const startedAt = useRef(0);
  if (building && buildingAt.current === null) buildingAt.current = performance.now() - startedAt.current;

  useEffect(() => {
    const canvas = canvasRef.current;
    const mark = markRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !mark || !ctx) return;

    const random = seeded(0x4b4153);
    const omega = (Math.PI * 2) / ORBIT_MS;
    const startAngle = HANDOFF_ANGLE - omega * durationMs;
    /** Each cursor's own sequence of bursts and pauses, which on average keeps up with the circle. */
    const planFlicks = (start: number) => {
      const flicks: Flick[] = [];
      const horizon = durationMs + TRAY_AFTER_MS + TRAY_MS + 1000;
      let t = -random() * 300, angle = start + omega * t;
      while (t < horizon) {
        const move = 240 + random() * 300;
        const rest = 50 + random() * random() * 300;
        const to = angle + omega * (move + rest) * (0.82 + random() * 0.36);
        flicks.push({ t0: t, t1: t + move, rest: t + move + rest, from: angle, to, bow: (random() - 0.5) * 30 });
        t += move + rest;
        angle = to;
      }
      return flicks;
    };
    // Agents are handed out alternately from the front of each group, so ids interleave.
    const cursors: Cursor[] = Array.from({ length: PER_FLOCK * 2 }, (_, i) => {
      const flock = i < PER_FLOCK ? 0 : 1, index = i % PER_FLOCK;
      const spread = index * 0.1 + (random() - 0.5) * 0.09;
      return {
        id: index * 2 + flock,
        flock,
        index,
        color: "",
        jitter: random() * Math.PI * 2,
        reach: 0.93 + random() * 0.24,
        flicks: planFlicks(startAngle + flock * Math.PI - spread),
        claimedAt: null
      };
    });
    const pointer = new Path2D(CURSOR_PATH);
    const inks = Array.from(mark.querySelectorAll<SVGPathElement>(".sig-ink"));
    const streaks = Array.from(mark.querySelectorAll<SVGPathElement>(".sig-streak"));
    const nib = mark.querySelector<SVGCircleElement>(".sig-nib");
    const fullStop = mark.querySelector<SVGCircleElement>(".sig-dot");
    const halo = mark.querySelector<SVGCircleElement>(".sig-halo");
    const reached = SIGNATURE_STROKES.map(() => -1);
    const curtain = mark.parentElement;

    let width = 0, height = 0, rx = 0, ry = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth; height = window.innerHeight;
      canvas.width = width * dpr; canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const markBox = mark.getBoundingClientRect();
      rx = Math.min(width * 0.46, Math.max(150, markBox.width / 2 + 90));
      ry = Math.min(height * 0.44, Math.max(markBox.height / 2 + 56, rx * 0.45));
    };
    resize();
    window.addEventListener("resize", resize);

    // Each letter of DEVELOPER surfaces as the closing flourish passes over it.
    const flourish = SIGNATURE_STROKES[FLOURISH];
    const turnStart = Math.floor(flourish.xs.length * 0.7);
    let sweepStart = turnStart;
    for (let i = turnStart; i < flourish.xs.length; i++) if (flourish.xs[i] < flourish.xs[sweepStart]) sweepStart = i;
    const svgBox = mark.querySelector("svg")?.getBoundingClientRect();
    let previous = 0;
    mark.querySelectorAll<HTMLElement>(".agent-signature-role span").forEach((letter) => {
      const box = letter.getBoundingClientRect();
      const x = svgBox ? SIGNATURE_VIEWBOX.x + ((box.left + box.width / 2 - svgBox.left) / svgBox.width) * SIGNATURE_VIEWBOX.width : 0;
      let i = sweepStart;
      while (i < flourish.xs.length - 1 && flourish.xs[i] < x) i++;
      const at = Math.max(TIMELINE[FLOURISH].at + TIMELINE[FLOURISH].ms * flourish.times[i], previous + LETTER_MIN_GAP);
      letter.style.animationDelay = `${Math.round(at)}ms`;
      previous = at;
    });

    /** Where a cursor's hand has it at time t (ms). Everything is a function of t, so the handoff can ask any time. */
    const orbit = (c: Cursor, t: number) => {
      const i = c.flicks.findIndex((f) => t < f.rest);
      const f = c.flicks[i < 0 ? c.flicks.length - 1 : i];
      const moving = clamp01((t - f.t0) / (f.t1 - f.t0));
      const since = Math.max(0, t - f.t1);
      // The hand runs slightly past its target, then corrects back during the pause.
      const correction = (f.to - f.from) * 0.07 * Math.exp(-since / 85) * Math.sin(since / 42);
      const theta = f.from + (f.to - f.from) * reachProfile(moving) + correction;
      // Real strokes curve a little, and no two cursors ride exactly the same line.
      const arc = f.bow * Math.sin(Math.PI * moving);
      const drift = 9 * Math.sin(t * 0.0011 + c.jitter);
      const tremorX = 0.5 * Math.sin(t * 0.053 + c.jitter) + 0.3 * Math.sin(t * 0.079 + c.jitter * 2);
      const tremorY = 0.5 * Math.sin(t * 0.047 + c.jitter * 3) + 0.3 * Math.sin(t * 0.083 + c.jitter);
      // The group sweeps in from further out as the shot opens.
      const arrive = 1 + 0.5 * (1 - easeOut(clamp01(t / 620)));
      const ex = Math.cos(theta), ey = Math.sin(theta);
      return {
        x: width / 2 + ex * (rx * c.reach * arrive + arc + drift) + tremorX,
        y: height / 2 + ey * (ry * c.reach * arrive + arc + drift) + tremorY
      };
    };

    /** Pose of a cursor at time t: its point on the circle, how settled it is, and its scale. */
    const settleAt = (t: number) => {
      const end = buildingAt.current === null ? durationMs : Math.min(durationMs, buildingAt.current + 260);
      return easeOut(clamp01((t - (end - SETTLE_MS)) / SETTLE_MS));
    };
    const pose = (c: Cursor, t: number) => {
      const p = orbit(c, t);
      const settled = settleAt(t);
      return { x: p.x, y: p.y, scale: 0.84 + (AGENT_SCALE - 0.84) * settled, settled };
    };
    const now = () => performance.now() - startedAt.current;

    handoff.current = {
      take: (agentId) => {
        const t = now();
        const cursor = cursors.find((c) => c.id === agentId);
        if (!cursor || cursor.claimedAt !== null || buildingAt.current === null || t > buildingAt.current + TRAY_AFTER_MS) return null;
        cursor.claimedAt = t;
        const p = pose(cursor, t);
        return { x: p.x - AGENT_TIP.x, y: p.y - AGENT_TIP.y };
      }
    };

    const drawPointer = (x: number, y: number, scale: number, color: string, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.translate(-1.5, -1.2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fill(pointer);
      ctx.restore();
    };

    startedAt.current = performance.now();
    let frame = 0;
    let done = false;
    const draw = () => {
      const t = now();
      ctx.clearRect(0, 0, width, height);
      const appear = clamp01(t / 260);
      const fadeFrom = Math.min(durationMs - FADE_MS, buildingAt.current ?? Infinity);
      const fade = easeOut(clamp01((t - fadeFrom) / FADE_MS));
      mark.style.opacity = String(1 - fade);
      mark.style.transform = `translate(-50%,-50%) scale(${1 + 0.05 * fade})`;
      if (curtain) curtain.style.backgroundColor = buildingAt.current === null ? "" : `rgba(5,5,10,${1 - easeOut(clamp01((t - buildingAt.current) / FADE_MS))})`;

      // Signature: the red streak runs ahead along the stroke, the pen follows and leaves ink.
      let nibAt: { x: number; y: number } | null = null;
      SIGNATURE_STROKES.forEach((stroke, i) => {
        const u = clamp01((t - TIMELINE[i].at) / TIMELINE[i].ms);
        if (u <= 0) return;
        const sample = sampleAt(stroke, u);
        if (sample !== reached[i]) {
          reached[i] = sample;
          inks[i].setAttribute("d", strokeOutline(stroke, sample));
        }
        if (u < 1) {
          streaks[i].setAttribute("d", strokeSlice(stroke, sample, sample + STREAK_SAMPLES));
          nibAt = { x: stroke.xs[sample], y: stroke.ys[sample] };
        } else if (streaks[i].getAttribute("d")) {
          streaks[i].setAttribute("d", "");
        }
      });
      if (nib) {
        const at = nibAt as { x: number; y: number } | null;
        nib.style.opacity = at ? "1" : "0";
        if (at) { nib.setAttribute("cx", String(at.x)); nib.setAttribute("cy", String(at.y)); }
      }
      if (fullStop) {
        const u = clamp01((t - WRITE_MS) / (SIGNATURE_MS - WRITE_MS));
        fullStop.style.opacity = String(u);
        fullStop.style.transform = `scale(${u ? 1 + 1.4 * (1 - easeOut(u)) : 0})`;
        if (halo) halo.style.opacity = String(u);
      }

      // Cursors: circle until an agent takes one over; the rest glide into the tray.
      const trayFrom = buildingAt.current === null ? Infinity : buildingAt.current + TRAY_AFTER_MS;
      const tray = clamp01((t - trayFrom) / TRAY_MS);
      const trayAt = tray > 0 ? callbacks.current.trayPoint() : null;
      for (const c of cursors) {
        if (c.claimedAt !== null) continue;
        const p = pose(c, Math.min(t, trayFrom));
        const color = pastel(AGENT_COLORS[c.id % AGENT_COLORS.length], 0.45 * (1 - p.settled));
        if (!trayAt) { drawPointer(p.x, p.y, p.scale, color, 0.94 * appear); continue; }
        const k = easeOut(tray);
        drawPointer(p.x + (trayAt.x - p.x) * k, p.y + (trayAt.y - p.y) * k, p.scale * (1 - 0.7 * k), color, 0.94 * (1 - k));
      }
      if (tray >= 1 && !done) { done = true; callbacks.current.onDone(); }
      if (!done) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); handoff.current = null; };
  }, [durationMs, handoff]);

  return <>
    <div ref={markRef} className="agent-signature">
      <svg className="agent-signature-svg" viewBox={`${SIGNATURE_VIEWBOX.x} ${SIGNATURE_VIEWBOX.y} ${SIGNATURE_VIEWBOX.width} ${SIGNATURE_VIEWBOX.height}`} fill="none" role="img" aria-label="Kasif">
        <defs>
          {/* In page units, so the shading stays put while the ink's shape grows. */}
          <linearGradient id="sig-silver" gradientUnits="userSpaceOnUse" x1="20" y1="14" x2="676" y2="314">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".55" stopColor="#eeeef3" />
            <stop offset="1" stopColor="#c4c4d0" />
          </linearGradient>
          <radialGradient id="sig-halo">
            <stop offset="0" stopColor="#E5322D" stopOpacity=".62" />
            <stop offset=".4" stopColor="#E5322D" stopOpacity=".2" />
            <stop offset="1" stopColor="#E5322D" stopOpacity="0" />
          </radialGradient>
        </defs>
        {SIGNATURE_STROKES.map((_, i) => <path key={`s${i}`} className="sig-streak" />)}
        {SIGNATURE_STROKES.map((_, i) => <path key={`i${i}`} className="sig-ink" fill="url(#sig-silver)" />)}
        <circle className="sig-halo" cx={FULL_STOP.x} cy={FULL_STOP.y} r={FULL_STOP.r * 3.6} />
        <circle className="sig-dot" cx={FULL_STOP.x} cy={FULL_STOP.y} r={FULL_STOP.r} />
        <circle className="sig-nib" r="3" cx="0" cy="0" />
      </svg>
      <span className="agent-signature-role" aria-label="Developer">
        {"DEVELOPER".split("").map((letter, i) => <span key={i}>{letter}</span>)}
      </span>
    </div>
    <canvas ref={canvasRef} className="agent-curtain-swarm" />
  </>;
}
