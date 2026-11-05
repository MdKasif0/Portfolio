"use client";

import { useEffect, useRef, type ReactNode } from "react";

const PHONE = "(max-width: 700px)";

/** Always open on wider screens. On a phone it starts folded, so the page stays short and the detail is one tap away. */
export function EdFold({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  const fold = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const phone = window.matchMedia(PHONE);
    const apply = () => { if (fold.current) fold.current.open = !phone.matches; };
    apply();
    phone.addEventListener("change", apply);
    return () => phone.removeEventListener("change", apply);
  }, []);

  return (
    <details className={`ed-fold ${className}`} ref={fold} open>
      <summary onClick={(event) => { if (!window.matchMedia(PHONE).matches) event.preventDefault(); }}>
        <h3 className="ed-label" data-layer="text" data-kind="ed-fold-label">{label}</h3>
        <i aria-hidden="true" />
      </summary>
      {children}
    </details>
  );
}
