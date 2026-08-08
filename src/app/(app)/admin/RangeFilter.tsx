"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { RANGES, parseRange } from "./range";

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
