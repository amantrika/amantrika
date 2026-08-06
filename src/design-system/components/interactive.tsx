"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, Share2, CloudSun } from "lucide-react";
import { Marigold, Diya } from "../motifs";
import { Card } from "./Card";
import { Button } from "./Button";

/** Interactive & data display components. */

/* ---------- FlipCard — 3D flip between two faces ---------- */
export function FlipCard({ front, back, className = "" }: { front: ReactNode; back: ReactNode; className?: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      onClick={() => setFlipped((f) => !f)}
      aria-pressed={flipped}
      className={`relative block w-full cursor-pointer text-left ${className}`}
      style={{ perspective: 1000 }}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="ornate-border rounded-card bg-surface p-6 shadow-resting" style={{ backfaceVisibility: "hidden" }}>
          {front}
        </div>
        <div
          className="absolute inset-0 rounded-card bg-primary p-6 text-bg shadow-resting"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {back}
        </div>
      </motion.div>
    </button>
  );
}

/* ---------- HoverTiltCard — pointer-tracked 3D tilt ---------- */
export function HoverTiltCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -10, y: ((e.clientX - r.left) / r.width - 0.5) * 10 });
      }}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      style={{ perspective: 800 }}
      className={className}
    >
      <motion.div
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
        className="ornate-border rounded-card bg-surface p-6 shadow-lifted"
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ---------- ConfettiButton — bursts petals on click ---------- */
export function ConfettiButton({ children, className = "", ...rest }: React.ComponentProps<typeof Button>) {
  const [bursts, setBursts] = useState<number[]>([]);
  return (
    <span className="relative inline-block">
      <Button
        variant="celebration"
        className={className}
        onClick={(e) => {
          setBursts((b) => [...b, Date.now()]);
          rest.onClick?.(e);
        }}
        {...rest}
      >
        {children}
      </Button>
      <AnimatePresence>
        {bursts.map((id) => (
          <span key={id} aria-hidden className="pointer-events-none absolute inset-0">
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
                animate={{
                  x: Math.cos((i / 10) * Math.PI * 2) * 70,
                  y: Math.sin((i / 10) * Math.PI * 2) * 55 - 20,
                  opacity: 0,
                  scale: 1,
                  rotate: 180,
                }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                onAnimationComplete={() => setBursts((b) => b.filter((x) => x !== id))}
                className="absolute left-1/2 top-1/2"
              >
                <Marigold className="size-4 text-accent" />
              </motion.span>
            ))}
          </span>
        ))}
      </AnimatePresence>
    </span>
  );
}

/* ---------- Chip — filter chip with selected state ---------- */
export function Chip({
  label,
  selected = false,
  onClick,
  className = "",
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-pill border px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
        selected ? "border-ornate bg-primary text-bg shadow-resting" : "border-ornate/40 text-muted hover:border-ornate hover:text-foreground"
      } ${className}`}
    >
      {label}
    </button>
  );
}

/* ---------- ProgressGarland — progress bar as a filling flower garland ---------- */
export function ProgressGarland({ value, max = 100, label, className = "" }: { value: number; max?: number; label?: string; className?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const flowers = 9;
  return (
    <div className={className} role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-label={label}>
      {label && <p className="type-overline mb-2">{label}</p>}
      <div className="relative h-8">
        <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-foreground/12" />
        <span className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-ornate transition-all duration-700" style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-between">
          {Array.from({ length: flowers }).map((_, i) => {
            const lit = (i / (flowers - 1)) * 100 <= pct;
            return <Marigold key={i} className={`size-5 transition-colors duration-500 ${lit ? "text-accent" : "text-foreground/20"}`} />;
          })}
        </span>
      </div>
    </div>
  );
}

/* ---------- RatingDiyas — 1–5 rating rendered as lit diyas ---------- */
export function RatingDiyas({ value, onChange, className = "" }: { value: number; onChange?: (v: number) => void; className?: string }) {
  return (
    <div className={`inline-flex gap-1.5 ${className}`} role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          aria-label={`${v} of 5`}
          onClick={() => onChange?.(v)}
          className="cursor-pointer"
        >
          <Diya className={`size-7 transition-colors ${v <= value ? "diya-flicker text-accent" : "text-foreground/20"}`} />
        </button>
      ))}
    </div>
  );
}

/* ---------- SeatCard — table assignment card ---------- */
export function SeatCard({ guest, table, side, className = "" }: { guest: string; table: string; side?: string; className?: string }) {
  return (
    <Card variant="envelope" className={`p-5 text-center ${className}`}>
      <p className="type-overline">Seat of honour</p>
      <p className="mt-1 type-script text-3xl">{guest}</p>
      <div className="gold-rule my-3" />
      <p className="font-display text-xl font-semibold text-primary">Table {table}</p>
      {side && <p className="type-caption">{side}</p>}
    </Card>
  );
}

/* ---------- RelationCard — family-tree person tile ---------- */
export function RelationCard({ name, relation, seed, className = "" }: { name: string; relation: string; seed: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 text-center ${className}`}>
      <span className="overflow-hidden rounded-full border-2 border-ornate shadow-resting">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://picsum.photos/seed/${seed}/96/96`} alt={name} width={72} height={72} className="size-18 object-cover" />
      </span>
      <div>
        <p className="text-sm font-bold text-primary">{name}</p>
        <p className="type-caption">{relation}</p>
      </div>
    </div>
  );
}

/* ---------- QRCard — stylised QR placeholder ---------- */
export function QRCard({ label = "Scan to open the invite", className = "" }: { label?: string; className?: string }) {
  return (
    <Card variant="ornate" className={`inline-flex flex-col items-center gap-3 p-6 ${className}`}>
      <div className="grid size-28 grid-cols-6 gap-0.5 rounded-soft border border-ornate/50 p-2">
        {Array.from({ length: 36 }).map((_, i) => (
          <span key={i} className={`rounded-[1px] ${(i * 7) % 3 === 0 ? "bg-foreground" : (i * 5) % 4 === 0 ? "bg-primary" : "bg-transparent"}`} />
        ))}
      </div>
      <span className="inline-flex items-center gap-1.5 type-caption"><QrCode className="size-3.5" /> {label}</span>
    </Card>
  );
}

/* ---------- ShareRow — share buttons strip ---------- */
export function ShareRow({ url, text = "You're invited!", className = "" }: { url: string; text?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-pill border border-ornate/60 px-4 py-1.5 text-sm font-semibold text-primary hover:bg-accent/10"
      >
        WhatsApp
      </a>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className="inline-flex items-center gap-1.5 rounded-pill border border-ornate/60 px-4 py-1.5 text-sm font-semibold text-primary hover:bg-accent/10 cursor-pointer"
      >
        <Share2 className="size-3.5" /> {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}

/* ---------- WeatherCard — static forecast tile for the big day ---------- */
export function WeatherCard({ city, temp = "24°", note = "Clear evening — perfect for pheras", className = "" }: { city: string; temp?: string; note?: string; className?: string }) {
  return (
    <Card className={`flex items-center gap-4 p-5 ${className}`}>
      <CloudSun className="size-10 shrink-0 text-accent" />
      <div>
        <p className="font-display text-2xl font-semibold text-primary">{temp} · {city}</p>
        <p className="type-caption">{note}</p>
      </div>
    </Card>
  );
}

/* ---------- GlowBadge & PulseDot — status micro-elements ---------- */
export function GlowBadge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-pill border border-ornate bg-accent/12 px-3.5 py-1 text-sm font-bold text-foreground shadow-gold-glow ${className}`}>
      {children}
    </span>
  );
}

export function PulseDot({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-flex size-2.5 ${className}`} aria-hidden>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
      <span className="relative inline-flex size-2.5 rounded-full bg-success" />
    </span>
  );
}

/* ---------- Marquee — generic infinite scroller ---------- */
export function Marquee({ children, duration = 22, className = "" }: { children: ReactNode; duration?: number; className?: string }) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="marquee-x flex w-max items-center gap-10" style={{ ["--marquee-duration" as string]: `${duration}s` } as React.CSSProperties}>
        <div className="flex items-center gap-10">{children}</div>
        <div className="flex items-center gap-10" aria-hidden>{children}</div>
      </div>
    </div>
  );
}
