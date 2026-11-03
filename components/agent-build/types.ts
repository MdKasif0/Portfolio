export type BuildPhase = "idle" | "scanning" | "building" | "finishing" | "done" | "skipped";

declare global {
  interface Window {
    __buildModeAudit?: () => { totalLayers: number; hiddenLayers: number; hiddenHeadings: number; pass: boolean };
  }
}
