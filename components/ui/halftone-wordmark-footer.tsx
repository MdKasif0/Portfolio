"use client";

// Halftone Wordmark Footer — adapted from the 21st.dev component for this portfolio.
// The wordmark is set to fill the width and cropped by the bottom edge, printed as a
// field of halftone dots. Each dot is sized by how much of the letter covers its cell,
// so the type keeps its edges at any scale. Move across it and the dots part around
// the pointer on springs, warming as they are pushed off their place; click and a
// shock ring runs through the word. Above it: the studio line, tracked link columns
// and a hairline rule with back-to-top, all over a fine print grain.
//
// Portfolio additions: a `reveal` value (also driven by the "hwf:reveal" event) that
// Build Mode uses to print the word in, dots dropping onto their place left to right;
// brand/rule slots; a dedicated band so the word never collides with the links.

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

export interface HalftonePalette {
  /** The footer background. */
  background: string;
  /** The dots at rest. */
  ink: string;
  /** The colour a dot warms toward as it is pushed off its place. */
  warm: string;
  /** Small type. Defaults to a light grey. */
  text?: string;
}

export type FooterLink = { label: string; href: string; index?: string; external?: boolean };
export type FooterColumn = { title: string; links: FooterLink[] };

export interface HalftoneWordmarkFooterProps {
  /** The giant word printed in dots. */
  wordmark: string;
  /** Top-left studio line. */
  label: string;
  /** The muted line under it. */
  meta?: string;
  /** Anything else for the brand column (status, socials). */
  brandExtra?: ReactNode;
  /** Link columns along the top. */
  columns: FooterColumn[];
  /** Left side of the hairline rule. */
  ruleStart?: ReactNode;
  /** Show the back-to-top link. Defaults to true. */
  backToTop?: boolean;
  palette: HalftonePalette;
  /** Distance between dot centres, in CSS px. Defaults to 6. */
  dotGap?: number;
  /** How far the pointer pushes, in CSS px. Defaults to 80. */
  radius?: number;
  /** How much of the word's cap height hangs below the bottom edge, 0–0.6. Defaults to 0.2. */
  crop?: number;
  /** Print grain over the dots, 0–1. Defaults to 0.5. */
  grain?: number;
  /** Pointer and click response. Defaults to true. */
  interactive?: boolean;
  /** Springs and the print-in drop. False draws everything at rest. Defaults to true. */
  animate?: boolean;
  /** 0–1: how much of the word is printed, swept left to right. Defaults to 1. */
  reveal?: number;
  /** Face for the wordmark. */
  fontFamily: string;
  fontWeight?: number;
  /** Face for the small type. */
  monoFamily?: string;
}

// #region halftone
// Pure helpers, as in the reference component.

/** Hex → [r, g, b] in 0–255, or null for anything that isn't #rgb / #rrggbb. */
export function hwfHex(hex: string) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Dot radius for a cell coverage in [0, 1]: area-true, so tone stays even. */
export function hwfRadius(coverage: number, gap: number) {
  const c = coverage < 0 ? 0 : coverage > 1 ? 1 : coverage;
  return Math.sqrt(c) * gap * 0.56;
}

/**
 * One step of a dot's spring back to home, plus the push from a pointer at
 * (px, py) within radius r. Returns [x, y, vx, vy]. Away from the pointer a
 * displaced dot always heads home and comes to rest.
 */
export function hwfStep(x: number, y: number, vx: number, vy: number, hx: number, hy: number, px: number, py: number, r: number) {
  const dx = x - px;
  const dy = y - py;
  const d2 = dx * dx + dy * dy;
  if (r > 0 && d2 < r * r) {
    const d = Math.sqrt(d2) + 0.001;
    const f = (1 - d / r) * 2.6;
    vx += (dx / d) * f;
    vy += (dy / d) * f;
  }
  vx = (vx + (hx - x) * 0.05) * 0.84;
  vy = (vy + (hy - y) * 0.05) * 0.84;
  return [x + vx, y + vy, vx, vy];
}

/** How warm a dot is drawn: 0 at home, 1 once it is `span` px or more away. */
export function hwfWarmth(x: number, y: number, hx: number, hy: number, span: number) {
  const d = Math.hypot(x - hx, y - hy);
  return span > 0 ? Math.min(1, d / span) : 0;
}

/** Font size that sets `measured` (width at 100px) to fill `width` exactly. */
export function hwfFitSize(measured: number, width: number) {
  return measured > 0 ? (width / measured) * 100 : 0;
}
// #endregion

/** Share of the band width the word's ink fills. */
const FILL = 0.98;
const STRIDE = 8; // x, y, vx, vy, hx, hy, r, printed
/** Width of the soft print edge, as a share of the word. The edge sits at x = reveal * (1 + SOFT) - SOFT / 2. */
export const HWF_PRINT_SOFT = 0.18;
const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n: number) => n * n * (3 - 2 * n);

export default function HalftoneWordmarkFooter({
  wordmark, label, meta, brandExtra, columns, ruleStart, backToTop = true, palette,
  dotGap = 6, radius = 80, crop = 0.2, grain = 0.5, interactive = true, animate = true, reveal = 1,
  fontFamily, fontWeight = 400, monoFamily = "system-ui, sans-serif"
}: HalftoneWordmarkFooterProps) {
  const rootRef = useRef<HTMLElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const opts = useRef({ palette, dotGap, radius, crop, grain, interactive, animate, reveal, fontFamily, fontWeight, wordmark });
  opts.current = { ...opts.current, palette, dotGap, radius, crop, grain, interactive, animate, fontFamily, fontWeight, wordmark };
  const key = [wordmark, dotGap, crop, fontFamily, fontWeight, palette.background, palette.ink, palette.warm].join("|");

  useEffect(() => {
    const root = rootRef.current, band = bandRef.current, canvas = canvasRef.current;
    if (!root || !band || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const still = () => motionQuery.matches || !opts.current.animate;
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true, awake = true, alive = true;
    let px = -1e5, py = -1e5;
    let ring = { x: 0, y: 0, t: -1 };
    let dots = new Float32Array(0), count = 0;
    let grainPattern: CanvasPattern | null = null;
    const ink = hwfHex(opts.current.palette.ink) || [229, 50, 45];
    const warm = hwfHex(opts.current.palette.warm) || [247, 247, 248];

    const layout = () => {
      const o = opts.current;
      const rect = band.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      // Set the word once on a 1x mask, sized so its ink fills the width and its visible cap fits the band.
      const mask = document.createElement("canvas");
      mask.width = w; mask.height = h;
      const m = mask.getContext("2d", { willReadFrequently: true });
      if (!m) return;
      const word = o.wordmark || " ";
      m.font = `${o.fontWeight} 100px ${o.fontFamily}`;
      const probe = m.measureText(word);
      const inkWidth = (probe.actualBoundingBoxLeft + probe.actualBoundingBoxRight) || probe.width;
      const capRatio = (probe.actualBoundingBoxAscent || 72) / 100;
      const c = clamp(o.crop, 0, 0.6);
      const size = Math.min(hwfFitSize(inkWidth, w * FILL), (h * 0.98) / (capRatio * (1 - c)));
      m.font = `${o.fontWeight} ${size}px ${o.fontFamily}`;
      const box = m.measureText(word);
      const boxInk = box.actualBoundingBoxLeft + box.actualBoundingBoxRight;
      m.fillStyle = "#000";
      m.textAlign = "left";
      m.textBaseline = "alphabetic";
      m.fillText(word, (w - boxInk) / 2 + box.actualBoundingBoxLeft, h + (box.actualBoundingBoxAscent || size * capRatio) * c);
      const img = m.getImageData(0, 0, w, h).data;

      const gap = Math.max(3, o.dotGap);
      const cols = Math.ceil(w / gap), rows = Math.ceil(h / gap);
      const tmp: number[] = [];
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          // Coverage: average alpha over a 3×3 sample of the cell.
          let sum = 0;
          for (let sy = 0; sy < 3; sy++) {
            for (let sx = 0; sx < 3; sx++) {
              const x = Math.min(w - 1, Math.floor(gx * gap + ((sx + 0.5) * gap) / 3));
              const y = Math.min(h - 1, Math.floor(gy * gap + ((sy + 0.5) * gap) / 3));
              sum += img[(y * w + x) * 4 + 3];
            }
          }
          const cov = sum / (9 * 255);
          if (cov < 0.06) continue;
          const hx = gx * gap + gap / 2, hy = gy * gap + gap / 2;
          const printed = local(hx) > 0.02 ? 1 : 0; // already-printed dots start home
          tmp.push(hx, hy, 0, 0, hx, hy, hwfRadius(cov, gap), printed);
        }
      }
      dots = new Float32Array(tmp);
      count = tmp.length / STRIDE;

      // A fixed tile of print grain, drawn once and laid over every frame.
      const tile = document.createElement("canvas");
      tile.width = tile.height = 256;
      const g = tile.getContext("2d");
      if (g) {
        const id = g.createImageData(256, 256);
        // Seeded, so a re-layout (resize, late font) never reshuffles the grain.
        let seed = 0x9e3779b9;
        const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
        for (let i = 0; i < id.data.length; i += 4) {
          const v = random() * 255;
          id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
          id.data[i + 3] = random() < 0.5 ? 0 : 255;
        }
        g.putImageData(id, 0, 0);
        grainPattern = ctx.createPattern(tile, "repeat");
      }
      awake = true;
    };

    /** Printed share at x: a soft-edged sweep that crosses the word linearly as reveal goes 0 → 1. */
    function local(x: number) {
      return smooth(clamp((opts.current.reveal * (1 + HWF_PRINT_SOFT) - x / Math.max(1, w)) / HWF_PRINT_SOFT));
    }

    const draw = (now: number) => {
      const o = opts.current;
      const isStill = still();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (o.palette.background !== "transparent") { ctx.fillStyle = o.palette.background; ctx.fillRect(0, 0, w, h); }

      const r = o.interactive && !isStill ? Math.max(0, o.radius) : 0;
      const ringAge = ring.t < 0 ? 1e9 : now - ring.t;
      const ringR = ringAge * 0.9;
      let moving = false;
      const loose: number[] = [];

      // Dots at rest are batched into one path per row (with a soft depth fade);
      // anything displaced is drawn afterwards in its warmed colour.
      let rowY = -1;
      const flushRow = () => {
        if (rowY < 0) return;
        ctx.globalAlpha = 0.55 + 0.45 * (1 - rowY / h);
        ctx.fill();
      };
      ctx.fillStyle = o.palette.ink;
      for (let i = 0; i < count; i++) {
        const j = i * STRIDE;
        let x = dots[j], y = dots[j + 1], vx = dots[j + 2], vy = dots[j + 3];
        const hx = dots[j + 4], hy = dots[j + 5];
        const share = local(hx);
        if (share <= 0.02) continue;
        if (!dots[j + 7]) {
          // First frame this dot is printed: drop it in from above so it springs onto its place.
          dots[j + 7] = 1;
          if (!isStill) { y = hy - 26 - ((hx * 7 + hy * 13) % 18); vy = 0; }
        }
        if (!isStill) {
          if (ringAge < 900) {
            const dx = hx - ring.x, dy = hy - ring.y;
            const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
            const bandHit = 1 - Math.min(1, Math.abs(d - ringR) / 26);
            if (bandHit > 0) {
              const f = bandHit * 3.2 * (1 - ringAge / 900);
              vx += (dx / d) * f;
              vy += (dy / d) * f;
            }
          }
          const s = hwfStep(x, y, vx, vy, hx, hy, px, py, r);
          x = s[0]; y = s[1]; vx = s[2]; vy = s[3];
          if (Math.abs(vx) + Math.abs(vy) > 0.02 || Math.abs(x - hx) + Math.abs(y - hy) > 0.05) moving = true;
          else { x = hx; y = hy; vx = 0; vy = 0; }
        } else { x = hx; y = hy; vx = 0; vy = 0; }
        dots[j] = x; dots[j + 1] = y; dots[j + 2] = vx; dots[j + 3] = vy;

        const radiusNow = dots[j + 6] * share;
        if (x !== hx || y !== hy) { loose.push(i); continue; }
        if (hy !== rowY) { flushRow(); rowY = hy; ctx.beginPath(); }
        ctx.moveTo(x + radiusNow, y);
        ctx.arc(x, y, radiusNow, 0, 6.2832);
      }
      flushRow();
      ctx.globalAlpha = 1;
      for (const i of loose) {
        const j = i * STRIDE, x = dots[j], y = dots[j + 1], hx = dots[j + 4], hy = dots[j + 5];
        const k = hwfWarmth(x, y, hx, hy, 28);
        ctx.fillStyle = `rgb(${Math.round(ink[0] + (warm[0] - ink[0]) * k)},${Math.round(ink[1] + (warm[1] - ink[1]) * k)},${Math.round(ink[2] + (warm[2] - ink[2]) * k)})`;
        ctx.beginPath();
        ctx.arc(x, y, dots[j + 6] * local(hx), 0, 6.2832);
        ctx.fill();
      }

      if (grainPattern && o.grain > 0) {
        // On a transparent footer an overlay pass would tint the whole band; print the grain onto the ink only.
        const onInk = o.palette.background === "transparent";
        ctx.globalAlpha = Math.min(1, o.grain) * (onInk ? 0.16 : 0.09);
        ctx.globalCompositeOperation = onInk ? "source-atop" : "overlay";
        ctx.fillStyle = grainPattern;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      if (root.dataset.hwfReady !== "true") root.dataset.hwfReady = "true";
      // Sleep once everything is home and nothing is pushing.
      awake = moving || (!isStill && ringAge < 900) || px > -1e4;
    };

    const loop = (now: number) => {
      raf = 0;
      if (!visible) return;
      draw(now);
      if (awake) raf = requestAnimationFrame(loop);
    };
    const wake = () => {
      awake = true;
      if (!raf && visible) raf = requestAnimationFrame(loop);
    };

    const toLocal = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      return [e.clientX - b.left, e.clientY - b.top];
    };
    const onMove = (e: PointerEvent) => {
      if (!opts.current.interactive) return;
      [px, py] = toLocal(e);
      wake();
    };
    const onLeave = () => { px = -1e5; py = -1e5; wake(); };
    const onDown = (e: PointerEvent) => {
      if (!opts.current.interactive || still()) return;
      const [x, y] = toLocal(e);
      ring = { x, y, t: performance.now() };
      wake();
    };
    const onReveal = (e: Event) => {
      const next = clamp(Number((e as CustomEvent<number>).detail));
      const previous = opts.current.reveal;
      opts.current.reveal = next;
      // Going backwards (a replay) un-prints dots, so they drop in again when the sweep returns.
      if (next < previous) for (let i = 0; i < count; i++) if (local(dots[i * STRIDE + 4]) <= 0.02) dots[i * STRIDE + 7] = 0;
      wake();
    };

    layout();
    wake();
    band.addEventListener("pointermove", onMove);
    band.addEventListener("pointerleave", onLeave);
    band.addEventListener("pointerdown", onDown);
    root.addEventListener("hwf:reveal", onReveal);
    const ro = new ResizeObserver(() => { layout(); wake(); });
    ro.observe(band);
    const io = new IntersectionObserver((entries) => {
      visible = entries[0] ? entries[0].isIntersecting : true;
      if (visible) wake();
    });
    io.observe(band);
    // A web font that lands late re-sets the word in its real face.
    document.fonts?.load(`${opts.current.fontWeight} 100px ${opts.current.fontFamily}`).catch(() => undefined).then(() => document.fonts.ready).then(() => {
      if (!alive) return;
      layout();
      wake();
    });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      band.removeEventListener("pointermove", onMove);
      band.removeEventListener("pointerleave", onLeave);
      band.removeEventListener("pointerdown", onDown);
      root.removeEventListener("hwf:reveal", onReveal);
    };
  }, [key]);

  // Props win over the last event value when they change (e.g. Build Mode ends).
  useEffect(() => {
    rootRef.current?.dispatchEvent(new CustomEvent("hwf:reveal", { detail: reveal }));
  }, [reveal]);

  const style = { "--hwf-bg": palette.background, "--hwf-ink": palette.ink, "--hwf-text": palette.text ?? "#c9c9d2", "--hwf-mono": monoFamily } as CSSProperties;
  return (
    <footer ref={rootRef} className="hwf" style={style} data-scene="footer">
      <div className="hwf-inner">
        <div className="hwf-top">
          <div className="hwf-brand">
            <strong data-layer="text" data-kind="footer-label">{label}</strong>
            {meta && <span className="hwf-meta" data-layer="text" data-kind="footer-meta">{meta}</span>}
            {brandExtra}
          </div>
          {columns.map((column) => (
            <nav className="hwf-col" key={column.title} aria-label={column.title}>
              <h3 data-layer="text" data-kind="footer-column-title">{column.title}</h3>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a data-magnetic data-layer="text" data-kind="footer-link" href={link.href} target={link.external ? "_blank" : undefined} rel={link.external ? "noreferrer" : undefined}>
                      {link.index && <span className="hwf-index" aria-hidden="true">{link.index}</span>}
                      <span className="hwf-link-label">{link.label}</span>
                      {link.external && <span className="hwf-ext" aria-hidden="true">↗</span>}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="hwf-rule" data-layer="line" data-kind="footer-rule">
          <div className="hwf-rule-start">{ruleStart}</div>
          {backToTop && <a href="#top" className="hwf-up" data-magnetic data-layer="button" data-kind="footer-top"><span className="hwf-link-label">Back to top</span> <span aria-hidden="true">↑</span></a>}
        </div>
      </div>
      <div ref={bandRef} className="hwf-mark" data-cursor-zone="ring">
        <canvas ref={canvasRef} data-layer="image" data-kind="canvas" aria-hidden="true" />
        <span className="sr-only">{wordmark}</span>
      </div>
    </footer>
  );
}
