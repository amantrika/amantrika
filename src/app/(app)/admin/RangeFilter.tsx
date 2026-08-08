"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/** The windows worth offering. Longer than 90 days stops being a trend. */
export const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

export const DEFAULT_RANGE = 30;

/** Coerces `?days=` to one of the offered windows; anything else falls back. */
export function parseRange(value: string | undefined): number {
  const n = Number(value);
  return RANGES.some((r) => r.days === n) ? n : DEFAULT_RANGE;
}

/**
 * Date-range filter, as links rather than a client-side control.
 *
 * The range lives in the URL, so a particular view is shareable and bookmarkable,
 * the back button behaves, and the page can stay a server component that fetches
 * exactly the window asked for instead of over-fetching and filtering in the
 * browser.
 */
export function RangeFilter() {
  const pathname = usePathname();
  const params = useSearchParams();
  const active = parseRange(params.get("days") ?? undefined);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <span className="type-overline">Period</span>
      <div
        role="group"
        aria-label="Date range"
        className="inline-flex rounded-pill border border-ornate/60 bg-surface p-1"
      >
        {RANGES.map((r) => {
          const isActive = r.days === active;
          const next = new URLSearchParams(params.toString());
          next.set("days", String(r.days));
          return (
            <Link
              key={r.days}
              href={`${pathname}?${next.toString()}`}
              aria-current={isActive ? "page" : undefined}
              scroll={false}
              className={`rounded-pill px-4 py-1.5 text-sm font-semibold transition-colors ${
                isActive ? "bg-primary text-bg shadow-resting" : "text-muted hover:text-foreground"
              }`}
            >
              {r.label}
            </Link>
          );
        })}
      </div>
      <span className="type-caption">compared with the previous {active} days</span>
    </div>
  );
}
