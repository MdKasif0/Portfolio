"use client";

import { useMemo } from "react";
import { compileBuildTasks } from "@/components/agent-build/taskCompiler";
import { buildModeConfig } from "@/components/agent-build/buildMode.config";
import type { BuildFrame, BuildLayer } from "@/components/agent-build/types";

/**
 * Compile marked DOM layers into deterministic camera-window task queues.
 */
export function useBuildScript(layers: BuildLayer[], cursorLimit: number, mobile = false): BuildFrame[] {
  return useMemo(() => {
    if (!layers.length) return [];
    const workerLimit = mobile
      ? Math.min(buildModeConfig.mobileRenderedCursors, cursorLimit)
      : Math.min(buildModeConfig.activeWorkerLimit, buildModeConfig.maxRenderedCursors, cursorLimit);
    const viewportHeight = typeof window === "undefined" ? 900 : window.innerHeight;
    return compileBuildTasks(layers, workerLimit, viewportHeight, mobile);
  }, [cursorLimit, layers, mobile]);
}
