"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export function RevealLines({
  children,
  className = "",
  "data-layer": layer,
  "data-kind": kind
}: { children: ReactNode; className?: string; "data-layer"?: string; "data-kind"?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <motion.span
      ref={ref}
      className={`reveal-line ${className}`}
      data-layer={layer}
      data-kind={kind}
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.span>
  );
}

export function RevealFade({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function CountUp({ value, active = true }: { value: number; active?: boolean }) {
  const [count, setCount] = useState(active ? value : 0);
  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 1100);
      setCount(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [active, value]);
  return <>{count}</>;
}

export function Magnetic({ children, strength = 0.12 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 20 });
  const springY = useSpring(y, { stiffness: 260, damping: 20 });
  const onMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * strength);
    y.set((event.clientY - rect.top - rect.height / 2) * strength);
  };
  const reset = () => { x.set(0); y.set(0); };
  return <motion.span ref={ref} className="magnetic-wrap" style={{ x: springX, y: springY }} onPointerMove={onMove} onPointerLeave={reset}>{children}</motion.span>;
}

export function Spotlight({ children, className = "" }: { children: ReactNode; className?: string }) {
  const update = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - bounds.top}px`);
  };
  return <div className={`spotlight ${className}`} onPointerMove={update}>{children}</div>;
}

export function Tilt({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(x, [-0.5, 0.5], ["-5deg", "5deg"]);
  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left) / rect.width - 0.5);
    y.set((event.clientY - rect.top) / rect.height - 0.5);
  };
  return <motion.div ref={ref} className={className} style={{ rotateX, rotateY, transformStyle: "preserve-3d" as CSSProperties["transformStyle"] }} onPointerMove={onMove} onPointerLeave={() => { x.set(0); y.set(0); }}>{children}</motion.div>;
}

export function Atmosphere() {
  return (
    <div className="global-atmosphere" aria-hidden="true">
      <span className="atmosphere-glow atmosphere-glow-one" data-layer="image" data-kind="glow" />
      <span className="atmosphere-glow atmosphere-glow-two" data-layer="image" data-kind="glow" />
      <span className="atmosphere-grid" data-layer="image" data-kind="grid" />
      <span className="atmosphere-grain" data-layer="image" data-kind="grain" />
      <span className="atmosphere-vignette" data-layer="image" data-kind="vignette" />
    </div>
  );
}

export function RulerDivider({ label }: { label: string }) {
  return <div className="ruler-divider container-x" data-layer="line" data-kind="ruler" aria-hidden="true"><span>{label}</span></div>;
}
