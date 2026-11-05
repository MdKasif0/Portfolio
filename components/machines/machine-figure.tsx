"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { drivers } from "@/components/machines/drivers";
import { schedule, type Figure, type Pose } from "@/components/machines/runtime";
import type { Machine } from "@/data/systems";
import "@/components/machines/iso.css";

/** Where the machine sits for anyone with reduced motion on: a moment with something happening everywhere. */
const STILL_FRAME = 2.7;

const cache = new Map<string, Promise<Figure>>();
const loadFigure = (id: string) => {
  if (!cache.has(id)) cache.set(id, fetch(`/figures/${id}.json`).then((response) => response.json() as Promise<Figure>));
  return cache.get(id) as Promise<Figure>;
};

/**
 * One machine and its stations. The drawing is plain SVG markup built by tools/figures. Every part runs
 * at once on one clock, and a second, slower clock walks the steps below it. A step only highlights its
 * parts and picks the readout; it never starts or stops anything. Both clocks stop offscreen, and reduced
 * motion gets a still frame.
 */
export function MachineFigure({ machine, name, label }: { machine: Machine; name: string; label: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const pose = useRef<Pose | null>(null);
  const clock = useRef(0);
  const running = useRef(STILL_FRAME);
  const lastStation = useRef(-1);
  const [ready, setReady] = useState(false);
  const [station, setStation] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const list = useRef<HTMLOListElement>(null);
  const { starts, total } = useMemo(() => schedule(machine.stations), [machine.stations]);

  const stationAt = useCallback((t: number) => {
    let found = 0;
    starts.forEach((start, index) => { if (t >= start) found = index; });
    return found;
  }, [starts]);

  const paint = useCallback((t: number) => {
    const wrapped = ((t % total) + total) % total;
    const now = stationAt(wrapped);
    if (pose.current && readout.current) {
      const text = pose.current(running.current, now);
      if (readout.current.textContent !== text) readout.current.textContent = text;
    }
    bar.current?.style.setProperty("--p", String(wrapped / total));
    if (now !== lastStation.current) {
      lastStation.current = now;
      setStation(now);
      const svg = stage.current?.querySelector("svg");
      if (svg) {
        const on = new Set(machine.stations[now].parts);
        svg.setAttribute("data-focus", "");
        svg.querySelectorAll("[data-part]").forEach((part) => part.toggleAttribute("data-on", on.has(part.getAttribute("data-part") ?? "")));
      }
    }
  }, [machine.stations, stationAt, total]);

  // Load the drawing as it nears the screen.
  useEffect(() => {
    const host = stage.current;
    if (!host) return;
    let cancelled = false;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      loadFigure(machine.figure).then((figure) => {
        if (cancelled || !stage.current) return;
        stage.current.innerHTML = `<svg class="iso-svg" viewBox="0 0 ${figure.width} ${figure.height}" role="img" aria-label="${figure.label.replace(/"/g, "&quot;")}">${figure.body}</svg>`;
        const svg = stage.current.querySelector("svg") as SVGSVGElement;
        pose.current = drivers[machine.figure](svg, figure);
        lastStation.current = -1;
        setReady(true);
      }).catch(() => undefined);
    }, { rootMargin: "900px 0px" });
    observer.observe(host);
    return () => { cancelled = true; observer.disconnect(); };
  }, [machine.figure, machine.stations]);

  // Run the tour while on screen.
  useEffect(() => {
    const host = frame.current;
    if (!ready || !host) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (still.matches) { clock.current = starts[0] + machine.stations[0].seconds - 0.05; paint(clock.current); return; }
    let handle = 0, last = 0, visible = false;
    const tick = (time: number) => {
      const dt = last ? Math.min((time - last) / 1000, 1 / 20) : 0;
      last = time;
      if (!pausedRef.current) { clock.current += dt; running.current += dt; }
      paint(clock.current);
      handle = visible ? requestAnimationFrame(tick) : 0;
    };
    const observer = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible && !handle) { last = 0; handle = requestAnimationFrame(tick); }
    }, { rootMargin: "120px 0px" });
    observer.observe(host);
    paint(clock.current);
    return () => { observer.disconnect(); cancelAnimationFrame(handle); };
  }, [machine.stations, paint, ready, starts]);

  const jump = useCallback((index: number) => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    clock.current = starts[index] + (still ? machine.stations[index].seconds - 0.05 : 0.001);
    paint(clock.current);
  }, [machine.stations, paint, starts]);

  // Clicking a part of the machine jumps to the station that uses it.
  const onStageClick = (event: MouseEvent<HTMLDivElement>) => {
    const name = (event.target as Element).closest("[data-part]")?.getAttribute("data-part");
    if (!name) return;
    const index = machine.stations.findIndex((item) => item.parts.includes(name));
    if (index >= 0) jump(index);
  };

  // A very slight tilt toward the pointer.
  const tilt = useRef({ frame: 0, x: 0, y: 0 });
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    tilt.current.x = (event.clientX - box.left) / box.width - 0.5;
    tilt.current.y = (event.clientY - box.top) / box.height - 0.5;
    if (tilt.current.frame) return;
    tilt.current.frame = requestAnimationFrame(() => {
      tilt.current.frame = 0;
      stage.current?.style.setProperty("transform", `perspective(1600px) rotateX(${(-tilt.current.y * 2.4).toFixed(2)}deg) rotateY(${(tilt.current.x * 3).toFixed(2)}deg)`);
    });
  };
  const onPointerLeave = () => stage.current?.style.removeProperty("transform");

  // Keep the active step in view when the list scrolls sideways on small screens.
  useEffect(() => {
    const host = list.current;
    const item = host?.children[station] as HTMLElement | undefined;
    if (host && item && host.scrollWidth > host.clientWidth) host.scrollTo({ left: item.offsetLeft - 8, behavior: "smooth" });
  }, [station]);

  const current = machine.stations[station];
  return (
    <div className="machine iso" data-figure={machine.figure}>
      <div className="machine-frame" ref={frame} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} data-layer="card" data-kind="machine-frame">
        <div className="machine-corners" aria-hidden="true">
          <span>{label}</span>
          <span>{machine.object}</span>
        </div>
        <div className={`machine-stage${ready ? " is-ready" : ""}`} ref={stage} onClick={onStageClick} style={{ aspectRatio: "1040 / 600" } as CSSProperties} />
        <div className="machine-corners is-bottom">
          <span className="machine-controls">
            <button type="button" className="machine-pause" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>{paused ? "Play" : "Pause"}</button>
            <span className="machine-hint">Click a part, or a step below</span>
          </span>
          <span className="machine-readout" ref={readout}>{machine.stations[0].title}</span>
        </div>
      </div>

      <div className="machine-rail">
        <span className="machine-progress" aria-hidden="true"><span ref={bar} /></span>
        <ol className="machine-stations" ref={list} aria-label={`${name}: the path through the system`}>
          {machine.stations.map((item, index) => (
            <li key={item.title} style={{ flexGrow: item.seconds }}>
              <button type="button" aria-pressed={index === station} onClick={() => jump(index)}>
                <span className="machine-station-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="machine-station-title">{item.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="machine-now" key={current.title}>
        <h3>{current.title}</h3>
        <p className="machine-maps">In the machine: {current.object}</p>
        <p>{current.note}</p>
      </div>

      {/* Every step in the page's text, for screen readers, search engines and anyone reading without the tour. */}
      <ol className="machine-all">
        {machine.stations.map((item) => <li key={item.title}>{item.title}: {item.note} (In the machine: {item.object}.)</li>)}
      </ol>
    </div>
  );
}
