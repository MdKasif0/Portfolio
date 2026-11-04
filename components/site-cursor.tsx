"use client";

import type { ReactNode } from "react";
import { MagneticCursor } from "@/components/ui/magnetic-cursor";
import { useMotionPreference } from "@/components/motion-shell";

export default function SiteCursor({ children }: { children: ReactNode }) {
  const { motionEnabled } = useMotionPreference();
  return (
    <MagneticCursor
      enabled={motionEnabled}
      cursorSize={18}
      cursorColor="#F7F7F8"
      blendMode="exclusion"
      shape="circle"
      magneticFactor={0.3}
      hoverPadding={10}
      lerpAmount={0.16}
      speedMultiplier={0.015}
      maxScaleX={0.9}
      maxScaleY={0.35}
      contrastBoost={1}
    >
      {children}
    </MagneticCursor>
  );
}
