"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

export type FooterColumn = { title: string; links: { label: string; href: string }[] };
export type HalftonePalette = { background: string; ink: string; warm: string; text?: string; accent?: string };
type Props = { wordmark: string; label: string; meta: string; columns: FooterColumn[]; palette: HalftonePalette; fontFamily: string; fontWeight?: number; monoFamily?: string; dotGap?: number; radius?: number; crop?: number; grain?: number; height?: string; interactive?: boolean; animate?: boolean; reveal?: number; brandExtra?: ReactNode; rule?: ReactNode };
const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n: number) => n * n * (3 - 2 * n);
const mix = (a: string, b: string, amount: number) => {
  const parse = (hex: string) => /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex)?.slice(1).map((part) => parseInt(part, 16)) ?? [255, 255, 255];
  const x = parse(a), y = parse(b); return `rgb(${x.map((value, index) => Math.round(value + (y[index] - value) * amount)).join(",")})`;
};

export default function HalftoneWordmarkFooter({ wordmark, label, meta, columns, palette, fontFamily, fontWeight = 400, monoFamily = "system-ui", dotGap = 6, radius = 96, crop = .18, grain = .55, height = "clamp(540px,58vw,900px)", interactive = true, animate = true, reveal = 1, brandExtra, rule }: Props) {
  const root = useRef<HTMLElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const opts = useRef({ reveal, animate, interactive, dotGap, radius, crop, grain, palette, wordmark, fontFamily, fontWeight });
  opts.current = { reveal, animate, interactive, dotGap, radius, crop, grain, palette, wordmark, fontFamily, fontWeight };

  useEffect(() => {
    const el = root.current, c = canvas.current; if (!el || !c) return;
    let raf = 0, visible = true, pointer = { x: -1e4, y: -1e4 }, ring = { x: 0, y: 0, time: -1 }, ready = false;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const wake = () => { if (!raf) raf = requestAnimationFrame(draw); };
    const draw = (now = performance.now()) => {
      raf = 0; const o = opts.current, rect = el.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      if (!visible || !rect.width || !rect.height) return;
      const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; c.style.width = `${rect.width}px`; c.style.height = `${rect.height}px`; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); if (o.palette.background === "transparent") ctx.clearRect(0, 0, rect.width, rect.height); else { ctx.fillStyle = o.palette.background; ctx.fillRect(0, 0, rect.width, rect.height); }
      ctx.font = `${o.fontWeight} ${Math.min(rect.width * .92, rect.height * 1.02)}px ${o.fontFamily}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const metrics = ctx.measureText(o.wordmark), th = (metrics.actualBoundingBoxAscent || rect.height*.36) + (metrics.actualBoundingBoxDescent || rect.height*.12);
      // The original component deliberately lets a portion of the cap height pass below the footer edge.
      const y0 = rect.height + th * clamp(o.crop, 0, .6);
      const gap = o.dotGap, image = document.createElement("canvas"), ic = image.getContext("2d")!; image.width = Math.ceil(rect.width / gap); image.height = Math.ceil(rect.height / gap); ic.fillStyle = "#fff"; ic.font = `${o.fontWeight} ${Math.min(rect.width * .92, rect.height * 1.02) / gap}px ${o.fontFamily}`; ic.textAlign = "center"; ic.textBaseline = "middle"; ic.fillText(o.wordmark, image.width / 2, y0 / gap);
      const data = ic.getImageData(0, 0, image.width, image.height).data, reduced = !o.animate || matchMedia("(prefers-reduced-motion: reduce)").matches;
      for (let iy = 0; iy < image.height; iy++) for (let ix = 0; ix < image.width; ix++) {
        const alpha = data[(iy * image.width + ix) * 4 + 3] / 255; if (alpha < .08) continue;
        const x = ix * gap + gap / 2, y = iy * gap + gap / 2, local = smooth(clamp(o.reveal * 1.6 - (x / rect.width) * .6)); let r = (gap * .39) * alpha * local; if (r < .2) continue;
        const dx = x - pointer.x, dy = y - pointer.y, distance = Math.hypot(dx, dy), hit = !reduced && o.interactive && distance < o.radius;
        const ringAge = ring.time < 0 ? 9e9 : now - ring.time, ringDistance = Math.abs(Math.hypot(x - ring.x, y - ring.y) - ringAge * .9);
        const shock = !reduced && ringAge < 900 ? clamp(1 - ringDistance / 26) * (1 - ringAge / 900) : 0;
        const force = hit ? (1 - distance / o.radius) : 0, offset = force * 10 + shock * 15;
        ctx.fillStyle = (force || shock) ? mix(o.palette.ink, o.palette.warm, clamp(force + shock)) : o.palette.ink;
        ctx.beginPath(); ctx.arc(x + (dx / Math.max(distance,1)) * offset, y + (dy / Math.max(distance,1)) * offset, r * (1 + force * .8), 0, Math.PI * 2); ctx.fill();
      }
      if (o.grain > 0) { ctx.globalAlpha = Math.min(1, o.grain) * .045; ctx.fillStyle = "#fff"; for (let i=0;i<Math.floor(rect.width*rect.height/380);i++) ctx.fillRect(Math.random()*rect.width,Math.random()*rect.height,1,1); ctx.globalAlpha=1; }
      if (!ready) { el.dataset.hwfReady = "true"; ready = true; }
      if ((!reduced && (pointer.x > -1e4 || now - ring.time < 900)) || o.reveal < 1) wake();
    };
    const onMove = (e: PointerEvent) => { const r = el.getBoundingClientRect(); pointer = { ...pointer, x: e.clientX-r.left, y:e.clientY-r.top }; if (opts.current.interactive) wake(); };
    const leave = () => { pointer.x = -1e4; pointer.y = -1e4; wake(); };
    const down = (e: PointerEvent) => { if (!opts.current.interactive || e.target instanceof Element && e.target.closest("a,button")) return; const r=el.getBoundingClientRect(); ring={x:e.clientX-r.left,y:e.clientY-r.top,time:performance.now()}; wake(); };
    const revealEvent = (e: Event) => { opts.current.reveal = clamp(Number((e as CustomEvent<number>).detail)); wake(); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) wake(); }, { threshold: .01 }); observer.observe(el);
    el.addEventListener("pointermove", onMove); el.addEventListener("pointerleave", leave); el.addEventListener("pointerdown", down); el.addEventListener("hwf:reveal", revealEvent as EventListener);
    (async () => { try { await document.fonts?.load(`${fontWeight} 100px ${fontFamily}`); } catch {} wake(); document.fonts?.ready.then(wake); })();
    const resize = new ResizeObserver(wake); resize.observe(el); return () => { cancelAnimationFrame(raf); observer.disconnect(); resize.disconnect(); el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", leave); el.removeEventListener("pointerdown", down); el.removeEventListener("hwf:reveal", revealEvent as EventListener); };
  }, [fontFamily, fontWeight, animate]);
  const style = { "--hwf-text": palette.text ?? palette.ink, "--hwf-accent": palette.accent ?? palette.warm, "--hwf-mono": monoFamily, height } as CSSProperties;
  return <footer ref={root} className="hwf" style={style} data-scene="footer"><div className="hwf-top"><div className="hwf-brand"><p data-layer="text" data-kind="footer-label">{label}</p><small data-layer="text" data-kind="footer-meta">{meta}</small>{brandExtra}</div><div className="hwf-cols">{columns.map((column) => <div className="hwf-col" key={column.title}><h3 data-layer="text" data-kind="footer-column-title">{column.title}</h3>{column.links.map((link) => <a data-layer="text" data-kind="footer-link" href={link.href} key={link.label}>{link.label}</a>)}</div>)}</div></div><div className="hwf-rule" data-layer="line" data-kind="footer-rule">{rule}<a href="#top" className="hwf-up" data-layer="button" data-kind="footer-top">BACK TO TOP ↑</a></div><canvas ref={canvas} data-layer="image" data-kind="canvas" aria-hidden="true" /></footer>;
}
