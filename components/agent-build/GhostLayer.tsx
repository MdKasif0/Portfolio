"use client";

import { useLayoutEffect, useRef } from "react";
import type { BuildAction, BuildLayer } from "@/components/agent-build/types";

type TextNodeSnapshot = { node: Text; value: string };

function copyComputedStyles(source: Element, clone: Element) {
  const computed = window.getComputedStyle(source);
  const cloneStyle = (clone as HTMLElement).style;
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    if (property === "opacity" || property === "visibility") continue;
    cloneStyle.setProperty(property, computed.getPropertyValue(property));
  }
}

export function GhostLayer({
  layer,
  action,
  text
}: {
  layer: BuildLayer;
  action: BuildAction;
  text: string;
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
      cloneElement.classList.remove("bm-hidden", "agent-layer-hidden", "agent-layer-hidden-image", "agent-build-ready", "agent-layer-revealed");
      if (cloneElement instanceof HTMLElement) {
        cloneElement.inert = true;
        if (cloneElement.hasAttribute("tabindex")) cloneElement.tabIndex = -1;
      }
    });

    clone.classList.add("agent-ghost-clone");
    clone.setAttribute("aria-hidden", "true");
    clone.style.setProperty("position", "absolute");
    clone.style.setProperty("inset", "0");
    clone.style.setProperty("width", "100%");
    clone.style.setProperty("height", "100%");
    clone.style.setProperty("margin", "0");
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
    let remaining = action === "TYPE" || action === "RETYPE"
      ? text.length
      : showText ? Number.POSITIVE_INFINITY : 0;
    textNodesRef.current.forEach(({ node, value }) => {
      const visibleLength = Math.min(value.length, Math.max(0, remaining));
      node.textContent = value.slice(0, visibleLength);
      remaining -= visibleLength;
    });

    if (layer.imageSrc) {
      clone.style.setProperty("background-image", imageIsPlaced ? layer.textStyle.backgroundImage : "none");
      clone.style.setProperty("background-color", imageIsPlaced ? layer.textStyle.backgroundColor : "#6f717b");
      const images = clone.matches("img")
        ? [clone as HTMLImageElement, ...Array.from(clone.querySelectorAll<HTMLImageElement>("img"))]
        : Array.from(clone.querySelectorAll<HTMLImageElement>("img"));
      images.forEach((image) => {
        image.classList.toggle("agent-ghost-image-hidden", !imageIsPlaced);
        if (imageIsPlaced) {
          image.classList.remove("bm-hidden", "agent-layer-hidden", "agent-layer-hidden-image");
        }
        if (imageIsPlaced && layer.imageSrc) image.setAttribute("src", layer.imageSrc);
      });
    } else if (action === "FILL") {
      clone.style.setProperty("background-color", layer.textStyle.backgroundColor);
    }
    clone.style.setProperty("border-radius", action === "ROUND_CORNERS" ? layer.textStyle.borderRadius : "0");
    if (action === "RESIZE_TEXT") {
      clone.style.setProperty("transform", `scale(${0.4 + (text.length / Math.max(1, layer.text.length)) * 0.6})`);
      clone.style.setProperty("transform-origin", "top left");
    }
  }, [action, layer, text]);

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
