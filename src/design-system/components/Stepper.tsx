"use client";

import { Diya } from "../motifs";

/**
 * Onboarding stepper — each step is a diya that "lights up" (gold + flicker)
 * once reached. Current step glows; completed steps stay lit.
 */
export function Stepper({
  steps,
  current,
  className = "",
}: {
  steps: string[];
  current: number; // 0-indexed
  className?: string;
}) {
  return (
    <ol className={`flex items-start justify-center gap-1 sm:gap-2 ${className}`} aria-label="Progress">
      {steps.map((label, i) => {
        const lit = i <= current;
        const isCurrent = i === current;
        return (
          <li key={label} className="flex flex-1 max-w-28 flex-col items-center gap-1 text-center" aria-current={isCurrent ? "step" : undefined}>
            <div className="flex w-full items-center">
              <span aria-hidden className={`h-px flex-1 ${i === 0 ? "opacity-0" : lit ? "bg-ornate" : "bg-foreground/15"}`} />
              <Diya
                aria-hidden
                className={`size-7 shrink-0 transition-colors duration-500 ${
                  lit ? "text-accent" : "text-foreground/25"
                } ${isCurrent ? "diya-flicker" : ""}`}
              />
              <span aria-hidden className={`h-px flex-1 ${i === steps.length - 1 ? "opacity-0" : i < current ? "bg-ornate" : "bg-foreground/15"}`} />
            </div>
            <span className={`text-[11px] font-semibold tracking-wide ${lit ? "text-foreground" : "text-muted"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
