import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { PatternBackground, type PatternName } from "../patterns";

/**
 * Physical-card ornaments: thread (dhaga) borders, stitching, zari braid,
 * lace, corner flourishes and material panels. Everything token-driven.
 */

/* ---------- ThreadBorder — the "dhage ki patti" ----------
 * A 3D running thread around a panel: dashed silk line + knot beads at the
 * corners, with a soft drop shadow that lifts it off the paper. */
export function ThreadBorder({
  children,
  animated = true,
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { animated?: boolean }) {
  return (
    <div className={`relative rounded-card bg-surface p-6 shadow-resting ${className}`} {...rest}>
      <svg aria-hidden className="pointer-events-none absolute inset-2 size-[calc(100%-1rem)] overflow-visible">
        <rect
          x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="12"
          fill="none" stroke="var(--color-border-ornate)" strokeWidth="2"
          strokeDasharray="10 6" strokeLinecap="round"
          className={animated ? "thread-run" : undefined}
          style={{ filter: "drop-shadow(0 1.5px 0.5px color-mix(in srgb, var(--color-text) 30%, transparent))" }}
        />
        {[["0%", "0%"], ["100%", "0%"], ["0%", "100%"], ["100%", "100%"]].map(([cx, cy]) => (
          <g key={`${cx}${cy}`}>
            <circle cx={cx} cy={cy} r="5" fill="var(--color-border-ornate)" />
            <circle cx={cx} cy={cy} r="5" fill="none" stroke="color-mix(in srgb, var(--color-text) 25%, transparent)" strokeWidth="1" />
            <circle cx={cx} cy={cy} r="2" fill="color-mix(in srgb, white 45%, var(--color-border-ornate))" />
          </g>
        ))}
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}

/* ---------- StitchedEdge — tailor's running stitch ---------- */
export function StitchedEdge({ children, className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`stitched rounded-card border border-ornate/30 bg-surface p-6 ${className}`} {...rest}>
      {children}
    </div>
  );
}

/* ---------- ZariBraid — woven gold braid strip ---------- */
export function ZariBraid({ className = "", height = 10 }: { className?: string; height?: number }) {
  return (
    <svg aria-hidden className={`w-full text-ornate ${className}`} height={height + 6} preserveAspectRatio="none">
      <defs>
        <pattern id="zari-braid" width="16" height={height + 6} patternUnits="userSpaceOnUse">
          <path d={`M0 ${height / 2 + 3} q4 -${height / 2} 8 0 t8 0`} fill="none" stroke="currentColor" strokeWidth="2" />
          <path d={`M0 ${height / 2 + 3} q4 ${height / 2} 8 0 t8 0`} fill="none" stroke="currentColor" strokeWidth="2" opacity=".55" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#zari-braid)" />
    </svg>
  );
}

/* ---------- ToranHanging — doorway garland with hanging leaves ---------- */
export function Toran({ className = "", swing = true }: { className?: string; swing?: boolean }) {
  return (
    <div aria-hidden className={`w-full overflow-hidden text-ornate ${className}`}>
      <svg viewBox="0 0 400 56" className="w-full" preserveAspectRatio="none">
        <path d="M0 6 Q 200 26 400 6" fill="none" stroke="currentColor" strokeWidth="2.5" />
        {Array.from({ length: 13 }).map((_, i) => {
          const x = 14 + i * 31;
          const sag = 6 + Math.sin((i / 12) * Math.PI) * 9;
          return (
            <g key={i} className={swing ? "swing-hang" : undefined} style={{ transformOrigin: `${x}px ${sag}px`, animationDelay: `${(i % 4) * 0.4}s` }}>
              <line x1={x} y1={sag} x2={x} y2={sag + 14} stroke="currentColor" strokeWidth="1.6" />
              {i % 2 === 0 ? (
                <path d={`M${x} ${sag + 14} l-6 8 a8 8 0 0 0 12 0 Z`} fill="currentColor" opacity=".9" />
              ) : (
                <circle cx={x} cy={sag + 18} r="5" fill="var(--color-primary)" opacity=".85" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---------- BuntingBorder — string of festive flags ---------- */
export function Bunting({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 44" className={`w-full ${className}`} preserveAspectRatio="none">
      <path d="M0 4 Q 200 20 400 4" fill="none" stroke="var(--color-border-ornate)" strokeWidth="2" />
      {Array.from({ length: 10 }).map((_, i) => {
        const x = 20 + i * 40;
        const y = 5 + Math.sin((i / 9) * Math.PI) * 7;
        const fills = ["var(--color-primary)", "var(--color-accent)", "var(--color-error)"];
        return <path key={i} d={`M${x - 10} ${y} h20 l-10 22 Z`} fill={fills[i % 3]} opacity=".88" />;
      })}
    </svg>
  );
}

/* ---------- LaceEdge — scalloped paper lace ---------- */
export function LaceEdge({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 400 22" preserveAspectRatio="none" className={`w-full text-ornate ${flip ? "rotate-180" : ""} ${className}`}>
      {Array.from({ length: 20 }).map((_, i) => (
        <g key={i}>
          <path d={`M${i * 20} 2 a10 10 0 0 1 20 0`} fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx={i * 20 + 10} cy="15" r="1.6" fill="currentColor" opacity=".8" />
        </g>
      ))}
    </svg>
  );
}

/* ---------- CornerFlourish — calligraphic corner swirl ---------- */
export function CornerFlourish({
  corner = "top-left",
  className = "",
}: {
  corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  className?: string;
}) {
  const flip = {
    "top-left": "",
    "top-right": "-scale-x-100",
    "bottom-left": "-scale-y-100",
    "bottom-right": "-scale-100",
  }[corner];
  return (
    <svg aria-hidden viewBox="0 0 64 64" className={`${flip} ${className}`}>
      <path d="M4 4c16 0 24 6 26 18 1.5 9-3 14-9 14-4.5 0-7-3-7-6.5 0-3 2-5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 4c0 16 6 24 18 26 9 1.5 14-3 14-9 0-4.5-3-7-6.5-7-3 0-5 2-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".7" />
      <circle cx="50" cy="10" r="1.6" fill="currentColor" />
      <circle cx="10" cy="50" r="1.6" fill="currentColor" />
    </svg>
  );
}

/* ---------- OrnateFrame — the full physical-card treatment ----------
 * Double gold border + corner flourishes + optional themed pattern wash
 * + paper texture. The "hold it in your hand" wrapper. */
export function OrnateFrame({
  children,
  pattern,
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { pattern?: PatternName }) {
  return (
    <div className={`ornate-border paper-texture relative overflow-hidden rounded-card shadow-lifted ${className}`} {...rest}>
      {pattern && <PatternBackground name={pattern} className="text-accent opacity-[0.06]" />}
      <CornerFlourish corner="top-left" className="absolute left-2 top-2 size-10 text-ornate/80" />
      <CornerFlourish corner="top-right" className="absolute right-2 top-2 size-10 text-ornate/80" />
      <CornerFlourish corner="bottom-left" className="absolute bottom-2 left-2 size-10 text-ornate/80" />
      <CornerFlourish corner="bottom-right" className="absolute bottom-2 right-2 size-10 text-ornate/80" />
      <div className="relative p-8">{children}</div>
    </div>
  );
}

/* ---------- Material panels ---------- */

export function EmbossedPanel({ children, className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`embossed rounded-card bg-surface p-6 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function DebossedPanel({ children, className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`debossed rounded-card bg-surface p-6 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function GlassCard({ children, className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-ornate/40 p-6 shadow-resting backdrop-blur-md ${className}`}
      style={{ background: "color-mix(in srgb, var(--color-surface) 62%, transparent)" }}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ---------- GoldFoilText — metallic foil-stamped lettering ---------- */
export function GoldFoilText({ children, as: Tag = "span", className = "" }: { children: ReactNode; as?: "span" | "h1" | "h2" | "h3" | "p"; className?: string }) {
  return <Tag className={`gold-foil ${className}`}>{children}</Tag>;
}

/* ---------- ShimmerDivider — thin animated gold rule ---------- */
export function ShimmerDivider({ className = "" }: { className?: string }) {
  return (
    <div role="separator" className={`relative h-px w-full overflow-hidden ${className}`}>
      <div className="gold-rule absolute inset-0" />
      <div
        className="absolute inset-y-0 w-24 marquee-x"
        style={{
          background: "linear-gradient(90deg, transparent, color-mix(in srgb, white 60%, var(--color-accent)), transparent)",
          ["--marquee-duration" as string]: "2.8s",
        } as CSSProperties}
      />
    </div>
  );
}

/* ---------- Sparkles — twinkling star field for hero moments ---------- */
export function Sparkles({ count = 10, className = "" }: { count?: number; className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className="absolute text-accent"
          style={{
            left: `${(i * 47) % 100}%`,
            top: `${(i * 31) % 100}%`,
            width: 8 + (i % 3) * 4,
            animation: `sparkle-pop ${2 + (i % 4) * 0.7}s ease-in-out ${(i % 5) * 0.5}s infinite`,
          }}
        >
          <path d="M10 0l2.2 7.8L20 10l-7.8 2.2L10 20l-2.2-7.8L0 10l7.8-2.2L10 0Z" fill="currentColor" />
        </svg>
      ))}
    </div>
  );
}

/* ---------- WaxDrip — melted wax edge for seals & headers ---------- */
export function WaxDrip({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 30" preserveAspectRatio="none" className={`w-full text-primary ${className}`}>
      <path
        d="M0 0h400v8c-14 0-16 14-26 14s-9-10-20-10-8 6-18 6-12-12-24-12-10 8-22 8-12-6-24-6-14 12-28 12-10-14-24-14-12 8-26 8-10-6-22-6-14 10-28 10-12-12-26-12-12 8-26 8-10-8-22-8-14 12-28 12-12-10-24-10-8 6-12 6V0Z"
        fill="currentColor"
      />
    </svg>
  );
}
