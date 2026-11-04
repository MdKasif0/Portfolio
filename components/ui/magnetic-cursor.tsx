"use client";

/**
 * Magnetic Cursor — rebuilt from the 21st.dev component for this portfolio.
 *
 * Only the visitor's real cursor. It ignores untrusted (scripted) pointer events, so Build Mode's
 * simulated agent cursors can never move it. All element targeting is delegated at the document
 * level, so cards, drawers, modals and anything revealed later work without a rescan.
 *
 * Element API:
 *   data-magnetic                      morph into the element and pull it toward the pointer
 *   data-magnetic-variant="outline"    1.5px ring instead of an inverted fill
 *   data-magnetic-color / -strength / -padding
 *   data-cursor-label="VIEW|PLAY|DRAG|OPEN"
 *   data-cursor-zone="ring"            56px outline ring
 *   data-cursor-native                 hide the custom cursor, show the native one
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";

type BlendMode = "difference" | "exclusion" | "normal" | "screen" | "overlay";
type Shape = "circle" | "square" | "rounded-square";
type Mode = "idle" | "text" | "fill" | "outline" | "label" | "ring" | "native";
type Point = { x: number; y: number };

export interface MagneticCursorProps {
  children: ReactNode;
  /** The site's Motion on/off switch. When false the native cursor is used and nothing stays mounted. */
  enabled?: boolean;
  magneticFactor?: number;
  lerpAmount?: number;
  hoverPadding?: number;
  cursorSize?: number;
  cursorColor?: string;
  blendMode?: BlendMode;
  cursorClassName?: string;
  shape?: Shape;
  speedMultiplier?: number;
  maxScaleX?: number;
  maxScaleY?: number;
  /** Kept for API parity with the original. Values other than 1 add a backdrop-filter contrast boost. */
  contrastBoost?: number;
}

const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const NATIVE = "input, textarea, select, [contenteditable]:not([contenteditable='false']), [data-cursor-native]";
const TEXT = "p, h1, h2, h3, h4, h5, h6, li, blockquote";
const INTERACTIVE = "a, button, [data-magnetic], [data-cursor-label]";

const LABEL_RED = "#E5322D";
const LABEL_SHADOW = "0 10px 30px rgba(229,50,45,.35)";
const LABEL_SIZES: Record<string, number> = { VIEW: 88, PLAY: 80, DRAG: 80, OPEN: 80 };
const LABEL_TEXT: Record<string, string> = { DRAG: "‹ DRAG ›" };
const RING_SIZE = 56;
const TEXT_SCALE = 1.25;
const RIPPLE_POOL = 4;
const NO_SHADOW = "0 0 0 0 rgba(0,0,0,0)";

const shapeRadius = (shape: Shape) => (shape === "circle" ? "50%" : shape === "square" ? "0px" : "8px");
const ringShadow = (color: string) => `inset 0 0 0 1.5px ${color}`;
const clearOf = (color: string) => {
  const hex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  return hex ? `rgba(${hex.slice(1).map((part) => parseInt(part, 16)).join(",")},0)` : "rgba(0,0,0,0)";
};
/** Grow a px radius by the hover padding so the morph stays concentric with the element. */
const paddedRadius = (radius: string, padding: number) => {
  const px = /^([\d.]+)px$/.exec(radius.trim());
  return px ? `${parseFloat(px[1]) + padding}px` : radius;
};
const numberAttr = (value: string | undefined, fallback: number) => {
  const parsed = value === undefined ? NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function MagneticCursor({
  children,
  enabled = true,
  magneticFactor = 0.3,
  lerpAmount = 0.16,
  hoverPadding = 10,
  cursorSize = 14,
  cursorColor = "#F7F7F8",
  blendMode = "exclusion",
  cursorClassName = "",
  shape = "circle",
  speedMultiplier = 0.015,
  maxScaleX = 0.9,
  maxScaleY = 0.35,
  contrastBoost = 1
}: MagneticCursorProps) {
  const [supported, setSupported] = useState(false);
  const active = enabled && supported;

  const cursorRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const labelTextRef = useRef<HTMLSpanElement>(null);
  const glyphRef = useRef<HTMLElement>(null);
  const youRef = useRef<HTMLSpanElement>(null);
  const rippleRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const config = { magneticFactor, lerpAmount, hoverPadding, cursorSize, cursorColor, blendMode, shape, speedMultiplier, maxScaleX, maxScaleY };
  const configRef = useRef(config);
  configRef.current = config;

  // P1: fine pointers only, never under reduced motion; both react to live changes.
  useEffect(() => {
    const fine = window.matchMedia(FINE_POINTER);
    const reduce = window.matchMedia(REDUCED_MOTION);
    const update = () => setSupported(fine.matches && !reduce.matches);
    update();
    fine.addEventListener("change", update);
    reduce.addEventListener("change", update);
    return () => {
      fine.removeEventListener("change", update);
      reduce.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const cursor = cursorRef.current, label = labelRef.current, labelText = labelTextRef.current, glyph = glyphRef.current, you = youRef.current;
    if (!active || !cursor || !label || !labelText || !glyph || !you) return;
    const root = document.documentElement;
    const ripples = rippleRefs.current.filter((node): node is HTMLSpanElement => node !== null);
    root.classList.add("has-custom-cursor");

    const c = configRef.current;
    const pointer: Point = { x: -100, y: -100 };
    const draw: Point = { x: -100, y: -100 };
    const previous: Point = { x: -100, y: -100 };
    const size = { w: c.cursorSize, h: c.cursorSize };
    const scale = { x: 1, y: 1 };
    const press = { value: 1 };
    let rotation = 0;
    let mode: Mode = "idle";
    let target: HTMLElement | null = null; // the magnetic element, label element or zone being hovered
    let padding = 0;
    let seen = false; // P2: hidden until the first trusted move
    let inside = false;
    let shown = false;
    let building = false;
    let rippleIndex = 0;

    const pulls = new WeakMap<HTMLElement, { x: gsap.QuickToFunc; y: gsap.QuickToFunc }>();
    const pulled = new Set<HTMLElement>();
    const pullFor = (element: HTMLElement) => {
      let pull = pulls.get(element);
      if (!pull) {
        pull = {
          x: gsap.quickTo(element, "x", { duration: 0.8, ease: "elastic.out(1, 0.4)" }),
          y: gsap.quickTo(element, "y", { duration: 0.8, ease: "elastic.out(1, 0.4)" })
        };
        pulls.set(element, pull);
      }
      pulled.add(element);
      return pull;
    };
    const release = (element: HTMLElement | null) => {
      if (!element || !pulled.has(element)) return;
      const pull = pulls.get(element);
      pull?.x(0);
      pull?.y(0);
    };

    gsap.set(cursor, { xPercent: -50, yPercent: -50, x: -100, y: -100, opacity: 0 });
    gsap.set(you, { opacity: 0 });
    gsap.set(label, { autoAlpha: 0, x: c.cursorSize / 2, y: c.cursorSize / 2 });
    const setX = gsap.quickSetter(cursor, "x", "px");
    const setY = gsap.quickSetter(cursor, "y", "px");
    const setRotation = gsap.quickSetter(cursor, "rotation", "deg");
    const setScaleX = gsap.quickSetter(cursor, "scaleX");
    const setScaleY = gsap.quickSetter(cursor, "scaleY");
    const setYouX = gsap.quickSetter(you, "x", "px");
    const setYouY = gsap.quickSetter(you, "y", "px");
    // The label is a zero-size anchor moved by transform, so the morph never shifts its text in layout (CLS).
    const setLabelX = gsap.quickSetter(label, "x", "px");
    const setLabelY = gsap.quickSetter(label, "y", "px");

    const updateVisibility = () => {
      const next = seen && inside && mode !== "native";
      if (next === shown) return;
      shown = next;
      gsap.to(cursor, { opacity: next ? 1 : 0, duration: 0.2, overwrite: "auto" });
      gsap.to(you, { opacity: next && building ? 1 : 0, duration: 0.2, overwrite: "auto" });
    };

    // P11: the "YOU" tag follows the Build Mode state attribute on <html>.
    const syncBuild = () => {
      building = root.dataset.build === "building" || root.dataset.build === "finishing";
      gsap.to(you, { opacity: building && shown ? 1 : 0, duration: 0.2, overwrite: "auto" });
    };
    const buildObserver = new MutationObserver(syncBuild);
    buildObserver.observe(root, { attributes: true, attributeFilter: ["data-build"] });
    syncBuild();

    /** Visual style for a mode. Blend-mode switches can't tween, so colours snap when it changes. */
    const applyStyle = (next: Mode, element: HTMLElement | null) => {
      const { cursorColor: color, blendMode: blend, shape: cursorShape } = configRef.current;
      let style: gsap.TweenVars;
      let nextBlend: string = blend;
      if (next === "fill" && element) {
        style = { backgroundColor: element.dataset.magneticColor || color, boxShadow: NO_SHADOW, borderRadius: paddedRadius(getComputedStyle(element).borderRadius, padding) };
      } else if (next === "outline" && element) {
        const ring = element.dataset.magneticColor || color;
        style = { backgroundColor: clearOf(color), boxShadow: ringShadow(ring), borderRadius: paddedRadius(getComputedStyle(element).borderRadius, padding) };
        nextBlend = "normal";
      } else if (next === "label") {
        style = { backgroundColor: LABEL_RED, boxShadow: LABEL_SHADOW, borderRadius: "50%" };
        nextBlend = "normal";
      } else if (next === "ring") {
        style = { backgroundColor: clearOf(color), boxShadow: ringShadow(color), borderRadius: "50%" };
        nextBlend = "normal";
      } else {
        style = { backgroundColor: color, boxShadow: NO_SHADOW, borderRadius: shapeRadius(cursorShape) };
      }
      const blendChanged = cursor.style.mixBlendMode !== nextBlend;
      cursor.style.mixBlendMode = nextBlend;
      gsap.to(cursor, { ...style, duration: blendChanged ? 0 : 0.22, ease: "power3.out", overwrite: "auto" });

      const isLabel = next === "label" && element;
      if (isLabel) {
        const value = (element.dataset.cursorLabel || "").toUpperCase();
        const text = LABEL_TEXT[value] ?? value;
        const glyphName = value === "PLAY" ? "play" : "";
        if (labelText.textContent !== text || (glyph.dataset.glyph ?? "") !== glyphName) {
          // Swap content only while hidden: invisible nodes don't count as layout shifts.
          gsap.set(label, { autoAlpha: 0 });
          labelText.textContent = text;
          glyph.dataset.glyph = glyphName;
        }
      }
      gsap.to(label, { autoAlpha: isLabel ? 1 : 0, duration: isLabel ? 0.22 : 0.12, delay: isLabel ? 0.06 : 0, overwrite: "auto" });
    };

    const setMode = (next: Mode, element: HTMLElement | null) => {
      if (next === mode && element === target) return;
      if (target && target !== element) release(target);
      const { hoverPadding: basePadding } = configRef.current;
      padding = element && (next === "fill" || next === "outline") ? numberAttr(element.dataset.magneticPadding, basePadding) : 0;
      mode = next;
      target = element;
      applyStyle(next, element);
      updateVisibility();
    };

    /** Innermost of magnetic / label wins, then zones, then text, then idle. */
    const resolve = (node: EventTarget | null) => {
      const element = node instanceof Element ? node : null;
      if (!element) return setMode("idle", null);
      if (element.closest(NATIVE)) return setMode("native", null);
      const magnetic = element.closest<HTMLElement>("[data-magnetic]");
      const labelled = element.closest<HTMLElement>("[data-cursor-label]");
      const hit = magnetic && labelled ? (labelled.contains(magnetic) ? magnetic : labelled) : magnetic || labelled;
      if (hit === magnetic && magnetic) return setMode(magnetic.dataset.magneticVariant === "outline" ? "outline" : "fill", magnetic);
      if (hit === labelled && labelled) return setMode("label", labelled);
      const zone = element.closest<HTMLElement>("[data-cursor-zone='ring']");
      if (zone) return setMode("ring", zone);
      if (element.closest(TEXT) && !element.closest(INTERACTIVE)) return setMode("text", null);
      setMode("idle", null);
    };

    const isMouse = (event: PointerEvent) => event.pointerType !== "touch";

    const onMove = (event: PointerEvent) => {
      if (!event.isTrusted) return; // P3
      if (!isMouse(event)) {
        inside = false;
        updateVisibility();
        return;
      }
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!seen) {
        seen = true;
        draw.x = previous.x = pointer.x;
        draw.y = previous.y = pointer.y;
        resolve(event.target);
      }
      inside = true;
      updateVisibility();

      if (target && (mode === "fill" || mode === "outline")) {
        const strength = numberAttr(target.dataset.magneticStrength, configRef.current.magneticFactor);
        const bounds = target.getBoundingClientRect();
        const offsetX = Number(gsap.getProperty(target, "x")) || 0;
        const offsetY = Number(gsap.getProperty(target, "y")) || 0;
        const pull = pullFor(target);
        pull.x((pointer.x - (bounds.left - offsetX + bounds.width / 2)) * strength);
        pull.y((pointer.y - (bounds.top - offsetY + bounds.height / 2)) * strength);
      }
    };

    const onOver = (event: PointerEvent) => {
      if (!event.isTrusted || !isMouse(event)) return;
      resolve(event.target);
    };

    const onOut = (event: PointerEvent) => {
      if (!event.isTrusted || event.relatedTarget) return;
      // Left the window (or entered an iframe, which is native territory anyway).
      inside = false;
      setMode("idle", null);
      updateVisibility();
    };

    const onDown = (event: PointerEvent) => {
      if (!event.isTrusted || !isMouse(event) || event.button !== 0 || mode === "native") return;
      gsap.to(press, { value: mode === "label" ? 0.92 : 0.85, duration: 0.12, ease: "power2.out", overwrite: true });
    };

    const onUp = (event: PointerEvent) => {
      if (!event.isTrusted) return;
      gsap.to(press, { value: 1, duration: 0.35, ease: "back.out(2.4)", overwrite: true });
    };

    // P10: pooled red ripple. Keyboard-activated clicks (detail 0) have no position and are skipped.
    const onClick = (event: MouseEvent) => {
      if (!event.isTrusted || event.detail === 0 || mode === "native" || !shown) return;
      const ripple = ripples[rippleIndex++ % ripples.length];
      if (!ripple) return;
      gsap.killTweensOf(ripple);
      gsap.set(ripple, { x: event.clientX, y: event.clientY, xPercent: -50, yPercent: -50, scale: 0, opacity: 0.6 });
      gsap.to(ripple, { scale: 1, opacity: 0, duration: 0.45, ease: "power2.out" });
    };

    const tick = () => {
      const { lerpAmount: lerp, cursorSize: base, speedMultiplier: speedFactor, maxScaleX: stretchX, maxScaleY: squashY } = configRef.current;
      const ratio = gsap.ticker.deltaRatio(60);
      const ease = (amount: number) => 1 - Math.pow(1 - amount, ratio);

      let goal: Point = pointer;
      let width = base;
      let height = base;
      let scaleX = 1;
      let scaleY = 1;
      let follow = lerp;

      // P5: track the hovered element every frame (magnetic pull, Lenis, layout animations).
      if (target && (mode === "fill" || mode === "outline")) {
        const bounds = target.getBoundingClientRect();
        if (!target.isConnected || bounds.width === 0 || bounds.height === 0) {
          setMode("idle", null);
        } else {
          goal = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
          width = bounds.width + padding * 2;
          height = bounds.height + padding * 2;
          follow = 0.3;
        }
      } else if (target && (mode === "label" || mode === "ring")) {
        if (!target.isConnected) setMode("idle", null);
        else width = height = mode === "ring" ? RING_SIZE : LABEL_SIZES[(target.dataset.cursorLabel || "").toUpperCase()] ?? 80;
      }

      const k = ease(follow);
      draw.x += (goal.x - draw.x) * k;
      draw.y += (goal.y - draw.y) * k;
      const dx = draw.x - previous.x;
      const dy = draw.y - previous.y;
      previous.x = draw.x;
      previous.y = draw.y;

      if (mode === "idle") {
        const speed = Math.hypot(dx, dy) * speedFactor;
        if (speed > 0.01) rotation = Math.atan2(dy, dx) * (180 / Math.PI);
        scaleX = 1 + Math.min(speed, stretchX);
        scaleY = 1 - Math.min(speed, squashY);
      } else if (mode === "text") {
        // Stays a circle over text, just slightly larger.
        rotation = 0;
        scaleX = TEXT_SCALE;
        scaleY = TEXT_SCALE;
      } else {
        rotation = 0;
      }

      const morph = ease(0.25);
      const nextW = size.w + (width - size.w) * morph;
      const nextH = size.h + (height - size.h) * morph;
      if (Math.abs(nextW - size.w) > 0.01 || Math.abs(nextH - size.h) > 0.01 || Math.abs(width - nextW) > 0.05) {
        size.w = Math.abs(width - nextW) < 0.05 ? width : nextW;
        size.h = Math.abs(height - nextH) < 0.05 ? height : nextH;
        cursor.style.width = `${size.w}px`;
        cursor.style.height = `${size.h}px`;
        setLabelX(size.w / 2);
        setLabelY(size.h / 2);
      }
      const scaleEase = ease(mode === "idle" ? 0.5 : 0.25);
      scale.x += (scaleX - scale.x) * scaleEase;
      scale.y += (scaleY - scale.y) * scaleEase;

      setX(draw.x);
      setY(draw.y);
      setRotation(rotation);
      setScaleX(scale.x * press.value);
      setScaleY(scale.y * press.value);
      if (building) {
        setYouX(pointer.x + 14);
        setYouY(pointer.y + 14);
      }
    };

    const listen: [string, EventListener][] = [
      ["pointermove", onMove as EventListener],
      ["pointerover", onOver as EventListener],
      ["pointerout", onOut as EventListener],
      ["pointerdown", onDown as EventListener],
      ["pointerup", onUp as EventListener],
      ["click", onClick as EventListener]
    ];
    // Capture phase so components that stop propagation (carousel, grid) can't hide events from the cursor.
    listen.forEach(([type, handler]) => document.addEventListener(type, handler, { capture: true, passive: true }));
    gsap.ticker.add(tick);

    return () => {
      listen.forEach(([type, handler]) => document.removeEventListener(type, handler, { capture: true }));
      gsap.ticker.remove(tick);
      buildObserver.disconnect();
      gsap.killTweensOf([cursor, label, you, press, ...ripples]);
      pulled.forEach((element) => {
        gsap.killTweensOf(element, "x,y");
        gsap.set(element, { clearProps: "transform" });
      });
      pulled.clear();
      root.classList.remove("has-custom-cursor");
    };
  }, [active]);

  const radius = shapeRadius(shape);
  const backdrop = contrastBoost !== 1 ? `contrast(${contrastBoost})` : undefined;
  // Children keep the same slot whether or not the cursor is active, so toggling never remounts the page.
  return (
    <>
      {children}
      {active && createPortal(
        <>
          <div
            ref={cursorRef}
            className={`magnetic-cursor ${cursorClassName}`.trim()}
            aria-hidden="true"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: 10000,
              width: cursorSize,
              height: cursorSize,
              borderRadius: radius,
              backgroundColor: cursorColor,
              mixBlendMode: blendMode,
              opacity: 0,
              pointerEvents: "none",
              willChange: "transform",
              backdropFilter: backdrop,
              WebkitBackdropFilter: backdrop
            }}
          >
            <span ref={labelRef} className="mc-label">
              <span className="mc-label-inner">
                <i ref={glyphRef} className="mc-glyph" />
                <span ref={labelTextRef} />
              </span>
            </span>
          </div>
          <span ref={youRef} className="mc-you" aria-hidden="true">YOU</span>
          {Array.from({ length: RIPPLE_POOL }, (_, index) => (
            <span key={index} ref={(node) => { rippleRefs.current[index] = node; }} className="mc-ripple" aria-hidden="true" />
          ))}
        </>,
        document.body
      )}
    </>
  );
}
