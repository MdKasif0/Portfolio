"use client";

import { useLayoutEffect, useRef } from "react";
import type { BuildAction, BuildLayer, TaskDetails } from "@/components/agent-build/types";

type TextNodeSnapshot = { node: Text; value: string };

function copyComputedStyles(source: Element, clone: Element) {
  const computed = window.getComputedStyle(source);
  const cloneStyle = (clone as HTMLElement).style;
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    cloneStyle.setProperty(property, computed.getPropertyValue(property));
  }
}

export function GhostLayer({
  layer,
  action,
  text,
  progress = 0,
  details
}: {
  layer: BuildLayer;
  action: BuildAction;
  text: string;
  progress?: number;
  details?: TaskDetails;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cloneRef = useRef<HTMLElement | null>(null);
  const textNodesRef = useRef<TextNodeSnapshot[]>([]);

  useLayoutEffect(() => {
    const source = layer.element;
    const clone = source.cloneNode(true) as HTMLElement;
    const sourceElements = [source, ...Array.from(source.querySelectorAll("*"))];
    const cloneElements = [clone, ...Array.from(clone.querySelectorAll("*"))];

    sourceElements.forEach((sourceElement, index) => {
      const cloneElement = cloneElements[index];
      if (!cloneElement) return;
      copyComputedStyles(sourceElement, cloneElement);
      cloneElement.removeAttribute("data-layer");
      cloneElement.removeAttribute("id");
      if (cloneElement instanceof HTMLElement) {
        cloneElement.inert = true;
        if (cloneElement.hasAttribute("tabindex")) cloneElement.tabIndex = -1;
      }
    });

    clone.classList.remove("agent-layer-hidden", "agent-layer-hidden-image", "agent-build-ready", "agent-layer-revealed");
    clone.classList.add("agent-ghost-clone");
    clone.setAttribute("aria-hidden", "true");
    clone.style.setProperty("position", "absolute");
    clone.style.setProperty("inset", "0");
    clone.style.setProperty("width", "100%");
    clone.style.setProperty("height", "100%");
    clone.style.setProperty("margin", "0");
    clone.style.setProperty("opacity", "1");
    clone.style.setProperty("transform", "none");
    clone.style.setProperty("pointer-events", "none");
    clone.inert = true;
    hostRef.current?.appendChild(clone);
    cloneRef.current = clone;

    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    const textNodes: TextNodeSnapshot[] = [];
    let node = walker.nextNode();
    while (node) {
      textNodes.push({ node: node as Text, value: node.textContent ?? "" });
      node = walker.nextNode();
    }
    textNodesRef.current = textNodes;

    return () => {
      clone.remove();
      cloneRef.current = null;
      textNodesRef.current = [];
    };
  }, [layer]);

  useLayoutEffect(() => {
    const clone = cloneRef.current;
    if (!clone) return;

    const imageIsPlaced = ["DROP_IMAGE", "CROP", "SWAP_IMAGE"].includes(action);
    const showText = [
      "TYPE", "RESIZE_TEXT", "STYLE", "RETYPE", "COPY_PASTE",
      "ADD_SYMBOL", "ROUND_CORNERS", "DROP_IMAGE", "CROP", "SWAP_IMAGE"
    ].includes(action);

    // Text typing character reveal
    let remaining = action === "TYPE" || action === "RETYPE"
      ? text.length
      : showText ? Number.POSITIVE_INFINITY : 0;

    textNodesRef.current.forEach(({ node, value }) => {
      const visibleLength = Math.min(value.length, Math.max(0, remaining));
      node.textContent = value.slice(0, visibleLength);
      remaining -= visibleLength;
    });

    // Image handling
    if (layer.imageSrc) {
      clone.style.setProperty("background-image", imageIsPlaced ? layer.textStyle.backgroundImage : "none");
      clone.style.setProperty("background-color", imageIsPlaced ? layer.textStyle.backgroundColor : "#6f717b");
      const images = clone.matches("img")
        ? [clone as HTMLImageElement, ...Array.from(clone.querySelectorAll<HTMLImageElement>("img"))]
        : Array.from(clone.querySelectorAll<HTMLImageElement>("img"));

      images.forEach((image) => {
        image.style.visibility = imageIsPlaced ? "visible" : "hidden";
        image.style.opacity = imageIsPlaced ? "1" : "0";
        if (imageIsPlaced) {
          image.classList.remove("agent-layer-hidden", "agent-layer-hidden-image");
          if (layer.imageSrc) image.setAttribute("src", layer.imageSrc);
        }
      });
    } else if (action === "FILL") {
      clone.style.setProperty("background-color", layer.textStyle.backgroundColor);
    }

    // Radius
    clone.style.setProperty("border-radius", action === "ROUND_CORNERS" ? layer.textStyle.borderRadius : "0");

    // RESIZE_TEXT: Transform scale from 40% to 100% with top-left origin (zero reflow!)
    if (action === "RESIZE_TEXT") {
      const scale = 0.4 + progress * 0.6;
      clone.style.setProperty("transform", `scale(${scale})`);
      clone.style.setProperty("transform-origin", "top left");
    } else {
      clone.style.setProperty("transform", "none");
    }

    // STYLE: Apply weight, color, tracking
    if (action === "STYLE") {
      clone.style.setProperty("color", layer.textStyle.color);
      clone.style.setProperty("font-weight", layer.textStyle.fontWeight);
      clone.style.setProperty("letter-spacing", layer.textStyle.letterSpacing);
    }
  }, [action, details, layer, progress, text]);

  const isImage = layer.type === "image" || layer.type === "card";
  const showImagePlaceholder = isImage && !["DROP_IMAGE", "CROP", "SWAP_IMAGE"].includes(action);

  return (
    <div ref={hostRef} className="agent-ghost-layer" aria-hidden="true">
      {showImagePlaceholder && (
        <span className="agent-image-placeholder">
          <svg viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2.5" width="12" height="11" rx="1" />
            <circle cx="5.5" cy="6" r="1.2" />
            <path d="m3.5 12 3.2-3.1 2.2 1.8 1.7-1.6 2 2.9" />
          </svg>
        </span>
      )}
    </div>
  );
}
