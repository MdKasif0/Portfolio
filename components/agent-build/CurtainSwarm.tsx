"use client";

import { useEffect, useRef } from "react";
import { AGENT_COLORS } from "@/components/agent-build/engine/agent";

/**
 * The opening shot before the build: two flocks of agent cursors orbit the dim KASIF
 * mark clockwise, then burst outward across the screen (turning into crosshairs) just
 * as the build starts. Drawn on one canvas; timed to end at `durationMs`.
 */

const PER_FLOCK = 9;
/** One full orbit, ms. */
const ORBIT_MS = 2700;
/** The burst takes the last part of the intro. */
const BURST_MS = 600;
/** Where the lead cursor of the first flock is when the burst starts (just past the right side). */
const BURST_ANGLE = 0.1;
/** Same pointer as the engine's agents (viewBox 0 0 16 20), pointing up-left at about -126°. */
const CURSOR_PATH = "M1.5 1.2 14 11.3l-5.6.5-3 4.9L1.5 1.2Z";
const CURSOR_HEADING = Math.atan2(-8.8, -6.5);

type Cursor = { flock: number; index: number; color: string; jitter: number; spread: number; reach: number };

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function pastel(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.45);
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function CurtainSwarm({ durationMs }: { durationMs: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const mark = markRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !mark || !ctx) return;

    const random = seeded(0x4b4153);
    const cursors: Cursor[] = Array.from({ length: PER_FLOCK * 2 }, (_, i) => ({
      flock: i < PER_FLOCK ? 0 : 1,
      index: i % PER_FLOCK,
      color: pastel(AGENT_COLORS[(i * 5) % AGENT_COLORS.length]),
      jitter: random() * Math.PI * 2,
      spread: (random() - 0.5) * 1.1,
      reach: 0.4 + random() * 0.55
    }));
    const pointer = new Path2D(CURSOR_PATH);
    const burstAt = Math.max(0, durationMs - BURST_MS);
    const omega = (Math.PI * 2) / ORBIT_MS;
    const startAngle = BURST_ANGLE - omega * burstAt;

    let width = 0, height = 0, rx = 0, ry = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth; height = window.innerHeight;
      canvas.width = width * dpr; canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const markBox = mark.getBoundingClientRect();
      rx = Math.min(width * 0.38, Math.max(150, markBox.width / 2 + 110));
      ry = Math.max(markBox.height / 2 + 60, rx * 0.5);
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

    const start = performance.now();
    let frame = 0;
    const draw = () => {
      const t = performance.now() - start;
      ctx.clearRect(0, 0, width, height);
      const appear = clamp01(t / 260);
      const burst = clamp01((t - burstAt) / BURST_MS);
      mark.style.opacity = String(1 - easeOut(burst));

      for (const c of cursors) {
        if (burst <= 0) {
          const p = orbit(c, t);
          ctx.save();
          ctx.globalAlpha = 0.94 * appear;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.heading - CURSOR_HEADING);
          ctx.scale(0.84, 0.84);
          ctx.translate(-1.5, -1.2);
          ctx.fillStyle = c.color;
          ctx.shadowColor = c.color;
          ctx.shadowBlur = 8;
          ctx.fill(pointer);
          ctx.restore();
          continue;
        }
        // Burst: fly outward from where the orbit left off, morphing from pointer to crosshair.
        const from = orbit(c, burstAt);
        const dir = Math.atan2(from.y - height / 2, from.x - width / 2) + c.spread;
        const dx = Math.cos(dir), dy = Math.sin(dir);
        const toEdge = Math.min(dx ? Math.abs((dx > 0 ? width - from.x : from.x) / dx) : Infinity, dy ? Math.abs((dy > 0 ? height - from.y : from.y) / dy) : Infinity);
        const travel = easeOut(burst) * toEdge * c.reach;
        const x = from.x + dx * travel, y = from.y + dy * travel;
        const fade = 1 - clamp01((burst - 0.82) / 0.18);
        const arrow = 1 - clamp01(burst * 3.2);
        ctx.save();
        ctx.translate(x, y);
        if (arrow > 0) {
          ctx.save();
          ctx.globalAlpha = 0.94 * arrow;
          ctx.rotate(from.heading - CURSOR_HEADING);
          ctx.scale(0.84, 0.84);
          ctx.translate(-1.5, -1.2);
          ctx.fillStyle = c.color;
          ctx.fill(pointer);
          ctx.restore();
        }
        ctx.globalAlpha = 0.9 * (1 - arrow) * fade;
        ctx.rotate((Math.PI / 4) * (1 - easeOut(burst)));
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-4.5, 0); ctx.lineTo(4.5, 0);
        ctx.moveTo(0, -4.5); ctx.lineTo(0, 4.5);
        ctx.stroke();
        ctx.restore();
      }
      if (t < durationMs + 200) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); };
  }, [durationMs]);

  return <>
    <span ref={markRef} className="agent-curtain-mark">KASIF</span>
    <canvas ref={canvasRef} className="agent-curtain-swarm" />
  </>;
}
