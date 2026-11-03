"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { AGENT_COLORS } from "@/components/agent-build/engine/agent";

/**
 * The opening shot before the build: a "Kasif." signature is hand-drawn stroke by stroke
 * (a red light streak runs ahead of a glowing pen that leaves white ink), DEVELOPER types
 * in underneath, and two flocks of agent cursors orbit it clockwise the whole time.
 *
 * Handoff: as the build starts the cursors settle into the builder agents' pose and colours
 * and keep orbiting; each new agent the engine spawns takes over one of them (`handoff.take`)
 * at its exact spot, then flies off to its first task. Cursors the engine never needs glide
 * into the control bar's agent tray. Cursors are drawn on one canvas.
 */

const PER_FLOCK = 9;
/** One full orbit, ms. */
const ORBIT_MS = 2700;
/** Cursors ease into the agents' pose and colours over this long before the build starts. */
const SETTLE_MS = 700;
/** The signature and the dark curtain fade out over this long as the build starts. */
const FADE_MS = 500;
/** Unclaimed cursors head for the tray this long after the build starts, taking `TRAY_MS`. */
const TRAY_AFTER_MS = 1600;
const TRAY_MS = 520;
/** Where the lead cursor of the first flock is when the build starts (just past the right side). */
const HANDOFF_ANGLE = 0.1;
/** Same pointer as the engine's agents (viewBox 0 0 16 20), pointing up-left at about -126°. */
const CURSOR_PATH = "M1.5 1.2 14 11.3l-5.6.5-3 4.9L1.5 1.2Z";
const CURSOR_HEADING = Math.atan2(-8.8, -6.5);
/** The engine draws agents at 15×19 for the 16×20 pointer, so its tip sits this far inside. */
const AGENT_SCALE = 15 / 16;
const AGENT_TIP = { x: 1.5 * AGENT_SCALE, y: 1.2 * (19 / 20) };

export type SwarmHandoff = { take: (agentId: number) => { x: number; y: number } | null };

/**
 * Signature strokes (viewBox 50 36 450 236), drawn in order. Each has a start and duration
 * in ms. `ink: false` is the brand-red full stop, which pops in instead of being drawn.
 */
const STROKES: { d: string; at: number; ms: number; ink?: false }[] = [
  // K: lead-in flourish swinging up into the stem, then the stem
  { d: "M 70 176 C 26 160, 44 92, 132 70 C 170 61, 200 56, 218 46 C 196 96, 162 164, 130 226", at: 120, ms: 560 },
  // K arm and leg, flowing on into a, s, i and the looped f
  { d: "M 300 56 C 256 96, 204 130, 178 140 C 202 150, 214 176, 222 198 C 226 212, 238 214, 252 202 C 262 192, 270 180, 274 170 C 258 160, 236 174, 238 196 C 240 214, 264 204, 276 178 L 268 206 C 270 214, 282 210, 294 196 C 302 186, 308 172, 306 166 C 314 182, 324 194, 314 206 C 306 214, 292 210, 292 204 C 304 210, 322 200, 334 180 L 326 206 C 328 214, 340 210, 350 198 C 364 174, 380 120, 394 78 C 402 54, 384 48, 376 72 C 362 114, 350 194, 336 252 C 332 266, 320 262, 326 248 C 336 228, 362 214, 384 206", at: 700, ms: 1180 },
  // i dot
  { d: "M 340 160 l 4 -5", at: 1900, ms: 90 },
  // underline swoosh, swept in from the right with a small loop at the end
  { d: "M 480 204 C 400 214, 270 224, 160 232 C 200 230, 214 240, 206 250 C 198 258, 186 248, 198 238", at: 2010, ms: 470 },
  // the red full stop, like the KASIF. wordmark
  { d: "M 404 202 l 0.1 0", at: 2520, ms: 260, ink: false }
];
/** DEVELOPER starts typing in once the signature is down. */
const DEVELOPER_AT = 2560;
const DEVELOPER_STEP = 55;
/** Longest the red streak runs ahead of the pen, in viewBox units. */
const STREAK_MAX = 120;

/** `id` is the builder agent this cursor becomes: the engine numbers its agents 0, 1, 2… */
type Cursor = { id: number; flock: number; index: number; color: string; jitter: number; claimedAt: number | null };

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
/** A pen speeds up through the middle of a stroke and eases into its ends. */
const pen = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;

/** The agent colour mixed toward white by `amount` (the intro's softer pastel look). */
function pastel(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}
/** Shortest signed turn from angle a to angle b. */
const turn = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

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
    // Agents are handed out alternately from the front of each flock, so ids interleave.
    const cursors: Cursor[] = Array.from({ length: PER_FLOCK * 2 }, (_, i) => ({
      id: (i % PER_FLOCK) * 2 + (i < PER_FLOCK ? 0 : 1),
      flock: i < PER_FLOCK ? 0 : 1,
      index: i % PER_FLOCK,
      color: "",
      jitter: random() * Math.PI * 2,
      claimedAt: null
    }));
    const pointer = new Path2D(CURSOR_PATH);
    const inks = Array.from(mark.querySelectorAll<SVGPathElement>(".sig-ink"));
    const streaks = Array.from(mark.querySelectorAll<SVGPathElement>(".sig-streak"));
    const nib = mark.querySelector<SVGCircleElement>(".sig-nib");
    const lengths = inks.map((path) => path.getTotalLength());
    inks.forEach((path, i) => { path.style.strokeDasharray = `${lengths[i]} ${lengths[i] + 1}`; path.style.strokeDashoffset = String(lengths[i]); });
    const omega = (Math.PI * 2) / ORBIT_MS;
    const startAngle = HANDOFF_ANGLE - omega * durationMs;
    const curtain = mark.parentElement;

    let width = 0, height = 0, rx = 0, ry = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth; height = window.innerHeight;
      canvas.width = width * dpr; canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const markBox = mark.getBoundingClientRect();
      rx = Math.min(width * 0.4, Math.max(150, markBox.width / 2 + 100));
      ry = Math.max(markBox.height / 2 + 56, rx * 0.45);
    };
    resize();
    window.addEventListener("resize", resize);

    /** Orbit position of a cursor at time t (ms). Followers trail the lead in a loose double row. */
    const orbit = (c: Cursor, t: number) => {
      const lead = startAngle + omega * t + c.flock * Math.PI;
      const theta = lead - c.index * 0.075;
      const wobble = Math.sin(c.index * 2.3 + t * 0.003 + c.jitter);
      const side = (c.index % 2 ? 1 : -1) * 6 + wobble * 4;
      const ex = Math.cos(theta), ey = Math.sin(theta);
      const scale = 1 + 0.06 * wobble;
      const nx = ex * rx, ny = ey * ry;
      const len = Math.hypot(nx / rx / rx, ny / ry / ry) || 1;
      return {
        x: width / 2 + nx * scale + (nx / rx / rx / len) * side,
        y: height / 2 + ny * scale + (ny / ry / ry / len) * side,
        heading: Math.atan2(ry * Math.cos(theta), -rx * Math.sin(theta))
      };
    };

    /** Pose of a cursor at time t: its orbit point, how settled it is, and its drawn tip. */
    const settleAt = (t: number) => {
      const end = buildingAt.current === null ? durationMs : Math.min(durationMs, buildingAt.current + 260);
      return easeOut(clamp01((t - (end - SETTLE_MS)) / SETTLE_MS));
    };
    const pose = (c: Cursor, t: number) => {
      const p = orbit(c, t);
      const settled = settleAt(t);
      return { x: p.x, y: p.y, rotation: (1 - settled) * turn(CURSOR_HEADING, p.heading), scale: 0.84 + (AGENT_SCALE - 0.84) * settled, settled };
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

    const drawPointer = (x: number, y: number, rotation: number, scale: number, color: string, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(rotation);
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
      let nibAt: DOMPoint | null = null;
      STROKES.forEach((stroke, i) => {
        const u = clamp01((t - stroke.at) / stroke.ms);
        const ink = inks[i], streak = streaks[i], length = lengths[i];
        if (stroke.ink === false) {
          ink.style.strokeDashoffset = "0";
          ink.style.opacity = String(u);
          ink.style.transform = `scale(${u ? 1 + 1.4 * (1 - easeOut(u)) : 0})`;
          return;
        }
        const drawn = length * pen(u);
        const ahead = length * pen(clamp01(u * 1.3 + 0.06));
        ink.style.strokeDashoffset = String(length - drawn);
        // Zero-length dashes still paint their round caps, so hide what hasn't started yet.
        ink.style.opacity = u > 0 ? "1" : "0";
        const lead = u > 0 && u < 1 ? Math.min(STREAK_MAX, Math.max(0, ahead - drawn)) : 0;
        streak.style.strokeDasharray = `${lead} ${length * 2}`;
        streak.style.strokeDashoffset = String(-drawn);
        streak.style.opacity = lead > 0.5 ? "1" : "0";
        if (u > 0 && u < 1) nibAt = ink.getPointAtLength(drawn);
      });
      if (nib) {
        const at = nibAt as DOMPoint | null;
        nib.style.opacity = at ? "1" : "0";
        if (at) { nib.setAttribute("cx", String(at.x)); nib.setAttribute("cy", String(at.y)); }
      }

      // Cursors: orbit until an agent takes one over; the rest glide into the tray.
      const trayFrom = buildingAt.current === null ? Infinity : buildingAt.current + TRAY_AFTER_MS;
      const tray = clamp01((t - trayFrom) / TRAY_MS);
      const trayAt = tray > 0 ? callbacks.current.trayPoint() : null;
      for (const c of cursors) {
        if (c.claimedAt !== null) continue;
        const p = pose(c, Math.min(t, trayFrom));
        const color = pastel(AGENT_COLORS[c.id % AGENT_COLORS.length], 0.45 * (1 - p.settled));
        if (!trayAt) { drawPointer(p.x, p.y, p.rotation, p.scale, color, 0.94 * appear); continue; }
        const k = easeOut(tray);
        drawPointer(p.x + (trayAt.x - p.x) * k, p.y + (trayAt.y - p.y) * k, p.rotation, p.scale * (1 - 0.7 * k), color, 0.94 * (1 - k));
      }
      if (tray >= 1 && !done) { done = true; callbacks.current.onDone(); }
      if (!done) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); handoff.current = null; };
  }, [durationMs, handoff]);

  return <>
    <div ref={markRef} className="agent-signature">
      <svg className="agent-signature-svg" viewBox="50 36 450 236" fill="none" role="img" aria-label="Kasif">
        <defs>
          <linearGradient id="sig-silver" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".55" stopColor="#e9e9ef" />
            <stop offset="1" stopColor="#b9b9c6" />
          </linearGradient>
        </defs>
        {STROKES.map((stroke, i) => <path key={`s${i}`} className="sig-streak" d={stroke.d} />)}
        {STROKES.map((stroke, i) => <path key={`i${i}`} className={stroke.ink === false ? "sig-ink sig-dot" : "sig-ink"} d={stroke.d} />)}
        <circle className="sig-nib" r="2.4" cx="0" cy="0" />
      </svg>
      <span className="agent-signature-role" aria-label="Developer">
        {"DEVELOPER".split("").map((letter, i) => <span key={i} style={{ animationDelay: `${DEVELOPER_AT + i * DEVELOPER_STEP}ms` }}>{letter}</span>)}
      </span>
    </div>
    <canvas ref={canvasRef} className="agent-curtain-swarm" />
  </>;
}
