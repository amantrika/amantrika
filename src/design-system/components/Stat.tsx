import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "./Card";

/**
 * KPI card: big display number, overline label, optional delta arrow and
 * inline SVG sparkline (no chart library).
 */
export function Stat({
  label,
  value,
  delta,
  spark,
  className = "",
}: {
  label: string;
  value: string | number;
  /** positive = up arrow in success color, negative = down in error color */
  delta?: number;
  /** series for the sparkline */
  spark?: number[];
  className?: string;
}) {
  return (
    <Card className={`p-5 ${className}`}>
      <p className="type-overline">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <span className="font-display text-4xl font-semibold text-primary">{value}</span>
        {delta !== undefined && (
          <span className={`flex items-center gap-0.5 text-sm font-bold ${delta >= 0 ? "text-success" : "text-error"}`}>
            {delta >= 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      {spark && spark.length > 1 && <Sparkline data={spark} className="mt-3 h-8 w-full text-accent" />}
    </Card>
  );
}

export function Sparkline({ data, className = "" }: { data: number[]; className?: string }) {
  const w = 120;
  const h = 32;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / range) * (h - 4)).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden className={className}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
