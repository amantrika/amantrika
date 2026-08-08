import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/design-system/components";

/**
 * A figure with its movement against the previous window of the same length.
 *
 * The design system's `Stat` takes a pre-computed `delta`; this derives it, and
 * — more importantly — handles the cases a naive percentage gets wrong:
 *
 *   - previous 0, current 0   → flat, not "0%" and not a divide by zero
 *   - previous 0, current > 0 → "new", because ∞% is not a useful number
 *
 * Direction is never carried by colour alone: every change ships an arrow and a
 * sign, so the meaning survives for a colourblind reader and in print.
 */
export function TrendStat({
  label,
  value,
  current,
  previous,
  /** Set when a fall is the good outcome. Nothing here needs it yet. */
  invert = false,
}: {
  label: string;
  value: string | number;
  current: number;
  previous: number;
  invert?: boolean;
}) {
  const movement = describe(current, previous);
  const good = invert ? movement.direction === "down" : movement.direction === "up";

  const tone =
    movement.direction === "flat"
      ? "text-muted"
      : good
        ? "text-success"
        : "text-error";

  const Icon =
    movement.direction === "up"
      ? ArrowUpRight
      : movement.direction === "down"
        ? ArrowDownRight
        : ArrowRight;

  return (
    <Card className="p-5">
      <p className="type-overline">{label}</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
        <span className="font-display text-4xl font-semibold text-primary">{value}</span>
        <span className={`inline-flex items-center gap-0.5 text-sm font-bold ${tone}`}>
          <Icon aria-hidden className="size-4" />
          {movement.text}
        </span>
      </div>
      <p className="mt-1 type-caption">
        {previous.toLocaleString("en-IN")} in the previous period
      </p>
    </Card>
  );
}

function describe(current: number, previous: number): {
  direction: "up" | "down" | "flat";
  text: string;
} {
  if (previous === 0 && current === 0) return { direction: "flat", text: "no change" };
  if (previous === 0) return { direction: "up", text: "new" };

  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 0.5) return { direction: "flat", text: "no change" };

  return {
    direction: change > 0 ? "up" : "down",
    text: `${Math.abs(change) >= 100 ? Math.round(Math.abs(change)) : Math.abs(change).toFixed(0)}%`,
  };
}
