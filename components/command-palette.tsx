"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { track } from "@/lib/analytics";

const CommandPalettePanel = dynamic(() => import("@/components/command-palette-panel").then((module) => module.CommandPalettePanel), { ssr: false });
const ShowreelModal = dynamic(() => import("@/components/showreel-modal").then((module) => module.ShowreelModal), { ssr: false });

export function openPalette() {
  window.dispatchEvent(new Event("palette:open"));
}

/** ⌘K or Ctrl+K anywhere on the site. The panel's code only loads the first time it opens. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [reel, setReel] = useState(false);

  useEffect(() => {
    const show = () => { setOpen(true); track("palette-opened"); };
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => { if (!value) track("palette-opened"); return !value; });
      }
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("palette:open", show);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("palette:open", show);
    };
  }, []);

  return (
    <>
      {open && <CommandPalettePanel onClose={() => setOpen(false)} onPlayReel={() => setReel(true)} />}
      {reel && <ShowreelModal onClose={() => setReel(false)} />}
    </>
  );
}
