"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionProps
} from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode
} from "react";
import { useMotionPreference } from "@/components/motion-shell";

const revealViewport = { once: true, amount: 0.2 } as const;
const expoOut = [0.16, 1, 0.3, 1] as const;

function useRevealReady() {
  const { motionEnabled } = useMotionPreference();
  const [ready, setReady] = useState(false);
  const [safe, setSafe] = useState(false);

  useEffect(() => {
    if (!motionEnabled) {
      setReady(false);
      setSafe(true);
      return;
    }

    let timer: number | undefined;
    const activate = () => {
      if (document.documentElement.dataset.motion !== "ready") return false;
      setReady(true);
      timer = window.setTimeout(() => setSafe(true), 2500);
      return true;
    };

    if (activate()) return () => window.clearTimeout(timer);
    const observer = new MutationObserver(() => {
      if (activate()) observer.disconnect();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    return () => {
      observer.disconnect();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [motionEnabled]);

  return { ready, safe };
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "p";
  "data-layer"?: string;
  "data-kind"?: string;
};

export function RevealFade({
  children,
  className,
  delay = 0,
  as: Tag = "div",
  ...dataProps
}: RevealProps) {
  const { ready, safe } = useRevealReady();
  const Component = motion[Tag];
  const animation: MotionProps["whileInView"] = ready && !safe
    ? { opacity: [0.7, 1], y: [18, 0] }
    : undefined;

  return (
    <Component
      className={className}
      initial={false}
      whileInView={animation}
      animate={safe ? { opacity: 1, y: 0 } : undefined}
      viewport={revealViewport}
      transition={{ duration: 0.72, ease: expoOut, delay }}
      {...dataProps}
    >
      {children}
    </Component>
  );
}

export function RevealLines({
  lines,
  className,
  accentLastLine = false,
  whiteFirstPeriod = false,
  id
}: {
  lines: string[];
  className?: string;
  accentLastLine?: boolean;
  whiteFirstPeriod?: boolean;
  id?: string;
}) {
  const { ready, safe } = useRevealReady();

  return (
    <h2 id={id} className={`section-header-title display-title${className ? ` ${className}` : ""}`}>
      {lines.map((line, index) => {
        const isAccent = accentLastLine && index === lines.length - 1;
        const motionProps: MotionProps = {
          initial: false,
          whileInView: ready && !safe ? { opacity: [0.7, 1], y: [18, 0] } : undefined,
          animate: safe ? { opacity: 1, y: 0 } : undefined,
          viewport: revealViewport,
          transition: { duration: 0.72, ease: expoOut, delay: index * 0.06 }
        };
        const Line = isAccent ? "em" : "span";
        const MotionLine = motion.create(Line);

        return (
          <span
            className="section-header-line-mask"
            data-layer="text"
            data-kind="headline-line"
            key={`${line}-${index}`}
          >
            <MotionLine className={isAccent ? "is-accent" : undefined} {...motionProps}>
              {line}<i className={`title-period${whiteFirstPeriod && index === 0 ? " white-period" : ""}`}>.</i>
            </MotionLine>
          </span>
        );
      })}
    </h2>
  );
}

export function CountUp({ value, active }: { value: number; active: boolean }) {
  const { motionEnabled } = useMotionPreference();
  const [count, setCount] = useState(value);

  useEffect(() => {
    if (!active || !motionEnabled) return;
    const started = performance.now();
    setCount(0);
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 1500);
      setCount(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, motionEnabled, value]);

  return <>{active && motionEnabled ? count : value}</>;
}

export function Magnetic({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  const { motionEnabled } = useMotionPreference();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 240, damping: 20 });
  const springY = useSpring(y, { stiffness: 240, damping: 20 });

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!motionEnabled) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - bounds.left - bounds.width / 2) * 0.1);
    y.set((event.clientY - bounds.top - bounds.height / 2) * 0.1);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: motionEnabled ? springX : 0, y: motionEnabled ? springY : 0 }}
      onPointerMove={move}
      onPointerLeave={reset}
    >
      {children}
    </motion.div>
  );
}

export function Spotlight({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  const handlePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - bounds.top}px`);
  };
  return (
    <div className={`spotlight${className ? ` ${className}` : ""}`} onPointerMove={handlePointer} {...props}>
      {children}
    </div>
  );
}

export function Tilt({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  const { motionEnabled } = useMotionPreference();
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 180, damping: 24 });
  const springY = useSpring(rotateY, { stiffness: 180, damping: 24 });
  const transform = useTransform(
    [springX, springY],
    ([xValue, yValue]) => `perspective(900px) rotateX(${xValue}deg) rotateY(${yValue}deg)`
  );

  return (
    <motion.div
      className={className}
      style={{ transform: motionEnabled ? transform : undefined }}
      onPointerMove={(event) => {
        if (!motionEnabled) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        rotateX.set(((event.clientY - bounds.top) / bounds.height - 0.5) * -4);
        rotateY.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 4);
      }}
      onPointerLeave={() => {
        rotateX.set(0);
        rotateY.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeader({
  index,
  label,
  titleLines,
  accentLastLine = false,
  aside,
  action,
  titleClassName,
  whiteFirstPeriod = false,
  className,
  id,
  eyebrowLayer = true
}: {
  index?: string;
  label: string;
  titleLines: string[];
  accentLastLine?: boolean;
  aside?: ReactNode;
  action?: ReactNode;
  titleClassName?: string;
  whiteFirstPeriod?: boolean;
  className?: string;
  id?: string;
  eyebrowLayer?: boolean;
}) {
  const { ready, safe } = useRevealReady();

  return (
    <div className={`section-header${className ? ` ${className}` : ""}`}>
      <div className="section-header-main">
        <p
          className="eyebrow section-header-eyebrow"
          data-layer={eyebrowLayer ? "text" : undefined}
          data-kind="section-eyebrow"
        >
          {index && <span className="section-header-index">{index}</span>}
          {index && <span aria-hidden="true"> / </span>}
          {label}
          <motion.i
            aria-hidden="true"
            data-layer="line"
            data-kind="header-hairline"
            initial={false}
            whileInView={ready && !safe ? { scaleX: 1 } : undefined}
            animate={safe ? { scaleX: 1 } : undefined}
            viewport={revealViewport}
            transition={{ duration: 0.8, ease: expoOut, delay: 0.08 }}
          />
        </p>
        <RevealLines
          id={id}
          className={titleClassName}
          lines={titleLines}
          accentLastLine={accentLastLine}
          whiteFirstPeriod={whiteFirstPeriod}
        />
      </div>
      {(aside || action) && (
        <div className="section-header-aside">
          {aside}
          {action}
        </div>
      )}
    </div>
  );
}

export function SectionRuler({ index }: { index: string }) {
  return (
    <div className="section-ruler container-x" aria-hidden="true" data-layer="line" data-kind="ruler">
      <span className="section-ruler-label">{index}</span>
      <span className="section-ruler-track" />
      <span className="section-ruler-label">08 PT GRID</span>
    </div>
  );
}

export function Atmosphere() {
  return (
    <div className="atmosphere" aria-hidden="true">
      <span className="atmosphere-glow atmosphere-glow-one" data-layer="image" data-kind="glow" />
      <span className="atmosphere-glow atmosphere-glow-two" data-layer="image" data-kind="glow" />
      <span className="atmosphere-grid" data-layer="line" data-kind="grid" />
      <span className="atmosphere-vignette" data-layer="image" data-kind="vignette" />
      <span className="atmosphere-grain" data-layer="image" data-kind="grain" />
    </div>
  );
}

export function ContentDiagnostics({ missing }: { missing: string[] }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && missing.length) {
      console.table(missing.map((field) => ({ missingContent: field })));
    }
  }, [missing]);
  return null;
}
