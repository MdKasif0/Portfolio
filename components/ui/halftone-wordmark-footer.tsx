"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

export type FooterLink = { label: string; href: string; index?: string; external?: boolean };
export type FooterColumn = { title: string; links: FooterLink[] };
export type HalftonePalette = { background: string; ink: string; warm: string; text?: string; accent?: string };
type Props = { wordmark: string; columns: FooterColumn[]; palette: HalftonePalette; fontFamily: string; fontWeight?: number; monoFamily?: string; dotGap?: number; radius?: number; crop?: number; grain?: number; interactive?: boolean; animate?: boolean; reveal?: number; brand?: ReactNode; rule?: ReactNode };
type Mask = { key: string; width: number; height: number; alpha: Float32Array };

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n: number) => n * n * (3 - 2 * n);
const parse = (hex: string) => /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex)?.slice(1).map((part) => parseInt(part, 16)) ?? [255, 255, 255];
const mix = (a: string, b: string, amount: number) => {
  const x = parse(a), y = parse(b); return `rgb(${x.map((value, index) => Math.round(value + (y[index] - value) * amount)).join(",")})`;
};
/** Share of the band width the wordmark fills; the rest is breathing room at the edges. */
const FILL = .965;

export default function HalftoneWordmarkFooter({ wordmark, columns, palette, fontFamily, fontWeight = 400, monoFamily = "system-ui", dotGap = 6, radius = 96, crop = .18, grain = .55, interactive = true, animate = true, reveal = 1, brand, rule }: Props) {
  const root = useRef<HTMLElement>(null), band = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const opts = useRef({ reveal, animate, interactive, dotGap, radius, crop, grain, palette, wordmark, fontFamily, fontWeight });
  opts.current = { reveal, animate, interactive, dotGap, radius, crop, grain, palette, wordmark, fontFamily, fontWeight };

  useEffect(() => {
    const el = root.current, area = band.current, c = canvas.current; if (!el || !area || !c) return;
    let raf = 0, visible = true, pointer = { x: -1e4, y: -1e4 }, ring = { x: 0, y: 0, time: -1 }, ready = false, mask: Mask | null = null;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const wake = () => { if (!raf) raf = requestAnimationFrame(draw); };

    /** Rasterise the wordmark once per size/font into a coarse alpha grid; frames only read it. */
    const sample = (width: number, height: number): Mask => {
      const o = opts.current, gap = o.dotGap, key = `${width}x${height}:${gap}:${o.wordmark}:${o.fontFamily}:${o.fontWeight}:${o.crop}`;
      if (mask?.key === key) return mask;
      const cols = Math.ceil(width / gap), rows = Math.ceil(height / gap), image = document.createElement("canvas"), ic = image.getContext("2d")!;
      image.width = cols; image.height = rows;
      ic.font = `${o.fontWeight} 100px ${o.fontFamily}`;
      const probe = ic.measureText(o.wordmark), capRatio = (probe.actualBoundingBoxAscent || 72) / 100, widthRatio = probe.width / 100;
      const visibleCap = 1 - clamp(o.crop, 0, .6);
      // Fit both the width and the band height, so the wordmark can never be clipped at the sides.
      const size = Math.min((width * FILL) / widthRatio, (height * .98) / (capRatio * visibleCap));
      ic.fillStyle = "#fff"; ic.textAlign = "center"; ic.textBaseline = "alphabetic"; ic.font = `${o.fontWeight} ${size / gap}px ${o.fontFamily}`;
      ic.fillText(o.wordmark, cols / 2, (height + size * capRatio * (1 - visibleCap)) / gap);
      const data = ic.getImageData(0, 0, cols, rows).data, alpha = new Float32Array(cols * rows);
      for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3] / 255;
      mask = { key, width: cols, height: rows, alpha };
      return mask;
    };

    const draw = (now = performance.now()) => {
      raf = 0; const o = opts.current, rect = area.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      if (!visible || !rect.width || !rect.height) return;
      const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, rect.width, rect.height);
      if (o.palette.background !== "transparent") { ctx.fillStyle = o.palette.background; ctx.fillRect(0, 0, rect.width, rect.height); }
      const gap = o.dotGap, grid = sample(Math.round(rect.width), Math.round(rect.height)), reduced = !o.animate || matchMedia("(prefers-reduced-motion: reduce)").matches;
      const ringAge = ring.time < 0 ? 9e9 : now - ring.time;
      for (let iy = 0; iy < grid.height; iy++) {
        const y = iy * gap + gap / 2, depth = .5 + .5 * (1 - y / rect.height); // letters fade into the page edge
        for (let ix = 0; ix < grid.width; ix++) {
          const alpha = grid.alpha[iy * grid.width + ix]; if (alpha < .08) continue;
          const x = ix * gap + gap / 2, local = smooth(clamp(o.reveal * 1.6 - (x / rect.width) * .6)); const r = (gap * .39) * alpha * local; if (r < .2) continue;
          const dx = x - pointer.x, dy = y - pointer.y, distance = Math.hypot(dx, dy), hit = !reduced && o.interactive && distance < o.radius;
          const ringDistance = Math.abs(Math.hypot(x - ring.x, y - ring.y) - ringAge * .9);
          const shock = !reduced && ringAge < 900 ? clamp(1 - ringDistance / 26) * (1 - ringAge / 900) : 0;
          const force = hit ? (1 - distance / o.radius) : 0, offset = force * 10 + shock * 15, heat = clamp(force + shock);
          ctx.globalAlpha = heat ? 1 : depth;
          ctx.fillStyle = heat ? mix(o.palette.ink, o.palette.warm, heat) : o.palette.ink;
          ctx.beginPath(); ctx.arc(x + (dx / Math.max(distance, 1)) * offset, y + (dy / Math.max(distance, 1)) * offset, r * (1 + force * .8), 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (o.grain > 0) { ctx.globalAlpha = Math.min(1, o.grain) * .045; ctx.fillStyle = "#fff"; for (let i = 0; i < Math.floor(rect.width * rect.height / 380); i++) ctx.fillRect(Math.random() * rect.width, Math.random() * rect.height, 1, 1); ctx.globalAlpha = 1; }
      if (!ready) { el.dataset.hwfReady = "true"; ready = true; }
      if ((!reduced && (pointer.x > -1e4 || now - ring.time < 900)) || o.reveal < 1) wake();
    };
    const onMove = (e: PointerEvent) => { const r = area.getBoundingClientRect(); pointer = { x: e.clientX - r.left, y: e.clientY - r.top }; if (opts.current.interactive) wake(); };
    const leave = () => { pointer = { x: -1e4, y: -1e4 }; wake(); };
    const down = (e: PointerEvent) => { if (!opts.current.interactive) return; const r = area.getBoundingClientRect(); ring = { x: e.clientX - r.left, y: e.clientY - r.top, time: performance.now() }; wake(); };
    const revealEvent = (e: Event) => { opts.current.reveal = clamp(Number((e as CustomEvent<number>).detail)); wake(); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) wake(); }, { threshold: .01 }); observer.observe(area);
    area.addEventListener("pointermove", onMove); area.addEventListener("pointerleave", leave); area.addEventListener("pointerdown", down); el.addEventListener("hwf:reveal", revealEvent as EventListener);
    (async () => { try { await document.fonts?.load(`${fontWeight} 100px ${fontFamily}`); } catch {} mask = null; wake(); document.fonts?.ready.then(() => { mask = null; wake(); }); })();
    const resize = new ResizeObserver(wake); resize.observe(area); return () => { cancelAnimationFrame(raf); observer.disconnect(); resize.disconnect(); area.removeEventListener("pointermove", onMove); area.removeEventListener("pointerleave", leave); area.removeEventListener("pointerdown", down); el.removeEventListener("hwf:reveal", revealEvent as EventListener); };
  }, [fontFamily, fontWeight, animate]);

  const style = { "--hwf-text": palette.text ?? palette.ink, "--hwf-accent": palette.accent ?? palette.warm, "--hwf-mono": monoFamily } as CSSProperties;
  return (
    <footer ref={root} className="hwf" style={style} data-scene="footer">
      <div className="hwf-inner">
        <div className="hwf-top">
          <div className="hwf-brand">{brand}</div>
          <nav className="hwf-cols" aria-label="Footer">
            {columns.map((column) => (
              <div className="hwf-col" key={column.title}>
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
              </div>
            ))}
          </nav>
        </div>
        <div className="hwf-rule" data-layer="line" data-kind="footer-rule">
          {rule}
          <a href="#top" className="hwf-up" data-magnetic data-layer="button" data-kind="footer-top">Back to top <span aria-hidden="true">↑</span></a>
        </div>
      </div>
      <div ref={band} className="hwf-mark" data-cursor-zone="ring">
        <canvas ref={canvas} data-layer="image" data-kind="canvas" aria-hidden="true" />
      </div>
    </footer>
  );
}
