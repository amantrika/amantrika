/**
 * The admin date-range window, shared by the server page and the client filter.
 *
 * Deliberately a plain module with no `"use client"`. These are pure values and
 * a pure function, but they were originally exported from `RangeFilter.tsx`,
 * which *is* a client component — and a server component cannot call a function
 * that lives in a client module, only render it or pass props to it. The admin
 * overview imports `parseRange` on the server, so it has to live somewhere
 * neutral that both sides can reach.
 */

/** The windows worth offering. Longer than 90 days stops being a trend. */
export const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

export const DEFAULT_RANGE = 30;

/**
 * Coerces `?days=` to one of the offered windows.
 *
 * Anything else — absent, nonsense, or an attempt to make the database group
 * over ten years — falls back to the default rather than reaching Postgres.
 */
export function parseRange(value: string | undefined): number {
  const n = Number(value);
  return RANGES.some((r) => r.days === n) ? n : DEFAULT_RANGE;
}
