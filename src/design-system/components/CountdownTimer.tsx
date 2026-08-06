"use client";

import { useEffect, useState } from "react";

/**
 * days : hours : mins : secs in the Display face with gold separators
 * that gently pulse. Counts down to `target` (ISO string).
 */
export function CountdownTimer({ target, className = "" }: { target: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = Math.max(0, (new Date(target).getTime() - (now ?? 0)) / 1000);
  const units = now
    ? [
        { label: "Days", value: Math.floor(diff / 86400) },
        { label: "Hours", value: Math.floor((diff % 86400) / 3600) },
        { label: "Mins", value: Math.floor((diff % 3600) / 60) },
        { label: "Secs", value: Math.floor(diff % 60) },
      ]
    : [
        { label: "Days", value: "–" as const },
        { label: "Hours", value: "–" as const },
        { label: "Mins", value: "–" as const },
        { label: "Secs", value: "–" as const },
      ];

  return (
    <div className={`flex items-start justify-center gap-2 sm:gap-4 ${className}`} role="timer" aria-label="Countdown to the wedding">
      {units.map((u, i) => (
        <div key={u.label} className="flex items-start gap-2 sm:gap-4">
          {i > 0 && (
            <span aria-hidden className="gentle-pulse pt-1 font-display text-3xl sm:text-5xl text-accent">
              :
            </span>
          )}
          <div className="flex min-w-14 flex-col items-center sm:min-w-20">
            <span className="font-display text-4xl font-semibold tabular-nums text-primary sm:text-6xl">
              {typeof u.value === "number" ? String(u.value).padStart(2, "0") : u.value}
            </span>
            <span className="type-overline mt-1">{u.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
