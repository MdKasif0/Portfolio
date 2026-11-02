import type { ReactNode } from "react";
import { RevealLines } from "@/components/design-primitives";

export function SectionHeader({
  index,
  label,
  titleLines,
  accentLastLine = false,
  aside,
  action,
  id,
  className = "",
  titleClassName = ""
}: {
  index?: string;
  label: string;
  titleLines: string[];
  accentLastLine?: boolean;
  aside?: ReactNode;
  action?: ReactNode;
  id?: string;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div className={`section-header ${className}`}>
      <div className="section-header-main">
        <p className="eyebrow section-header-eyebrow" data-layer="text" data-kind="section-eyebrow">
          {index && <><span>{index}</span> / </>}{label}
          <i className="section-header-rule" data-layer="line" data-kind="section-rule" aria-hidden="true" />
        </p>
        <h2 id={id} className={`display-title section-header-title ${titleClassName}`} data-layer="text" data-kind="headline">
          {titleLines.map((line, lineIndex) => {
            const hasPeriod = line.endsWith(".");
            return (
              <RevealLines
                className={accentLastLine && lineIndex === titleLines.length - 1 ? "is-accent" : ""}
                data-layer="text"
                data-kind={accentLastLine && lineIndex === titleLines.length - 1 ? "section-headline-accent" : "section-headline-line"}
                key={`${lineIndex}-${line}`}
              >
                {hasPeriod ? line.slice(0, -1) : line}
                {hasPeriod && <span className="title-period">.</span>}
              </RevealLines>
            );
          })}
        </h2>
      </div>
      {aside && <div className="section-header-aside" data-layer="text" data-kind="aside">{aside}</div>}
      {action && <div className="section-header-action" data-layer="button" data-kind="action">{action}</div>}
    </div>
  );
}
