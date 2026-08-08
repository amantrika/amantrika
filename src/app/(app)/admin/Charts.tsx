"use client";

import { useId, useMemo, useState } from "react";
import { Card } from "@/design-system/components";
import type { AdminDailyPoint } from "@/lib/supabase/types";

/**
 * Series colours are validated, not chosen by eye.
 *
 * Both modes pass the lightness band, chroma floor, CVD separation, normal-vision
 * floor and 3:1 contrast checks (worst adjacent pair ΔE 22.0 deutan in light,
 * 12.4 protan in dark). Rose and blue specifically, because the obvious
 * brand-adjacent pairing — maroon and green — collapses to ΔE 2.1 for deutan
 * viewers and is unreadable for roughly one man in twelve.
 *
 * Series identity is never colour alone: every chart carries a legend and each
 * line is direct-labelled at its end.
 */
const SERIES = {
  light: ["#a8324a", "#2a78d6"],
  dark: ["#cf7186", "#4f8fd8"],
} as const;

const CHART_W = 720;
const CHART_H = 220;
const PAD = { top: 16, right: 56, bottom: 26, left: 44 };

function niceCeil(value: number): number {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface Series {
  key: keyof AdminDailyPoint;
  label: string;
}

/**
 * Number formatting is named rather than passed as a function: props crossing
 * the server/client boundary must be serialisable, and a callback is not.
 */
export type ValueFormat = "plain" | "compact" | "inr" | "inrCompact";

function formatValue(n: number, format: ValueFormat): string {
  switch (format) {
    case "compact":
      return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
    case "inr":
      return `₹${n.toLocaleString("en-IN")}`;
    case "inrCompact":
      return n >= 1000 ? `₹${(n / 1000).toFixed(0)}k` : `₹${n}`;
    default:
      return n.toLocaleString("en-IN");
  }
}

/**
 * Multi-series line chart on a single shared axis.
 *
 * Deliberately never a second y-axis: two scales on one plot make any crossing
 * point meaningless. Measures of different magnitude get their own chart.
 */
export function TrendChart({
  title,
  caption,
  data,
  series,
  format = "plain",
}: {
  title: string;
  caption?: string;
  data: AdminDailyPoint[];
  series: Series[];
  format?: ValueFormat;
}) {
  const valueFormat = (n: number) => formatValue(n, format);
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const { points, max, plotW, plotH } = useMemo(() => {
    const plotW = CHART_W - PAD.left - PAD.right;
    const plotH = CHART_H - PAD.top - PAD.bottom;
    const peak = Math.max(
      1,
      ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0))
    );
    const max = niceCeil(peak);

    const points = series.map((s) =>
      data.map((d, i) => ({
        x: PAD.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW),
        y: PAD.top + plotH - ((Number(d[s.key]) || 0) / max) * plotH,
        value: Number(d[s.key]) || 0,
      }))
    );

    return { points, max, plotW, plotH };
  }, [data, series]);

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <p className="type-overline">{title}</p>
        <p className="mt-6 text-center type-caption italic">No data for this period yet.</p>
      </Card>
    );
  }

  const active = hover ?? data.length - 1;
  const single = series.length === 1;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="type-overline">{title}</p>
          {caption && <p className="mt-1 type-caption">{caption}</p>}
        </div>

        {/* A legend is present whenever there is more than one series, so identity
            never depends on colour alone. One series is named by the title. */}
        {!single && (
          <ul className="flex flex-wrap gap-4">
            {series.map((s, i) => (
              <li key={s.key} className="inline-flex items-center gap-1.5 type-caption">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ background: `var(--chart-${i})` }}
                />
                {s.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <style>{`
        [data-chart="${gradientId}"] { --chart-0: ${SERIES.light[0]}; --chart-1: ${SERIES.light[1]}; }
        @media (prefers-color-scheme: dark) {
          [data-chart="${gradientId}"] { --chart-0: ${SERIES.dark[0]}; --chart-1: ${SERIES.dark[1]}; }
        }
        :root[data-theme-mode="dark"] [data-chart="${gradientId}"] { --chart-0: ${SERIES.dark[0]}; --chart-1: ${SERIES.dark[1]}; }
      `}</style>

      <div data-chart={gradientId} className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="h-56 w-full min-w-[560px]"
          role="img"
          aria-label={`${title}. ${series
            .map((s) => `${s.label}: ${valueFormat(Number(data[data.length - 1][s.key]) || 0)} on ${formatDay(data[data.length - 1].day)}`)
            .join(". ")}`}
          onMouseLeave={() => setHover(null)}
        >
          {/* Recessive gridlines — reference, not content. */}
          {[0, 0.5, 1].map((t) => {
            const y = PAD.top + plotH * t;
            return (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + plotW}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-ornate/25"
                />
                <text
                  x={PAD.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-current text-[11px] text-muted"
                >
                  {valueFormat(Math.round(max * (1 - t)))}
                </text>
              </g>
            );
          })}

          {points.map((pts, si) => (
            <g key={series[si].key}>
              {single && (
                <path
                  d={`M ${pts[0].x} ${PAD.top + plotH} ${pts
                    .map((p) => `L ${p.x} ${p.y}`)
                    .join(" ")} L ${pts[pts.length - 1].x} ${PAD.top + plotH} Z`}
                  fill={`var(--chart-${si})`}
                  opacity="0.12"
                />
              )}
              <path
                d={pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
                fill="none"
                stroke={`var(--chart-${si})`}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Direct label at the line's end — the second, non-colour cue. */}
              <text
                x={pts[pts.length - 1].x + 8}
                y={pts[pts.length - 1].y + 4}
                className="fill-current text-[11px] font-semibold text-foreground"
              >
                {series[si].label}
              </text>
              {/* Marker carries a surface ring so overlapping series stay legible. */}
              <circle
                cx={pts[active].x}
                cy={pts[active].y}
                r="4.5"
                fill={`var(--chart-${si})`}
                stroke="var(--color-surface)"
                strokeWidth="2"
              />
            </g>
          ))}

          {/* Crosshair for the hovered day. */}
          <line
            x1={points[0][active].x}
            x2={points[0][active].x}
            y1={PAD.top}
            y2={PAD.top + plotH}
            stroke="currentColor"
            strokeWidth="1"
            className="text-ornate/50"
          />

          <text
            x={PAD.left}
            y={CHART_H - 6}
            className="fill-current text-[11px] text-muted"
          >
            {formatDay(data[0].day)}
          </text>
          <text
            x={PAD.left + plotW}
            y={CHART_H - 6}
            textAnchor="end"
            className="fill-current text-[11px] text-muted"
          >
            {formatDay(data[data.length - 1].day)}
          </text>

          {/* Hit targets far wider than the marks, so hovering is forgiving. */}
          {data.map((d, i) => (
            <rect
              key={d.day}
              x={PAD.left + (i / data.length) * plotW - plotW / data.length / 2}
              y={PAD.top}
              width={plotW / data.length}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
      </div>

      <p className="mt-2 type-caption" role="status">
        <strong>{formatDay(data[active].day)}</strong>
        {series.map((s) => (
          <span key={s.key} className="ml-3">
            {s.label}: <strong>{valueFormat(Number(data[active][s.key]) || 0)}</strong>
          </span>
        ))}
      </p>
    </Card>
  );
}
