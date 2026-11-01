export function DimensionChip({ width, height }: { width: number; height: number }) {
  return (
    <span className="agent-dimension-chip" aria-hidden="true">
      {Math.round(width)} × {Math.round(height)}
    </span>
  );
}
