"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Diya } from "../motifs";
import { PhotoFrame } from "./PhotoFrame";

/**
 * Wedding décor set: ambient decorations that make a page feel like a
 * mandap, not a website. All theme-token driven.
 */

/* ---------- DiyaRow — a shelf of flickering diyas ---------- */
export function DiyaRow({ count = 5, className = "" }: { count?: number; className?: string }) {
  return (
    <div aria-hidden className={`flex items-end justify-center gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Diya key={i} className="diya-flicker size-8 text-accent" style={{ animationDelay: `${i * 0.35}s` }} />
      ))}
    </div>
  );
}

/* ---------- GarlandDivider — varmala swag between sections ---------- */
export function GarlandDivider({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 48" preserveAspectRatio="none" className={`w-full text-ornate ${className}`}>
      <path d="M0 10 Q 100 44 200 30 T 400 10" fill="none" stroke="currentColor" strokeWidth="2" />
      {Array.from({ length: 11 }).map((_, i) => {
        const x = 20 + i * 36;
        const y = 12 + Math.sin((i / 10) * Math.PI) * 20;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="4.5" fill="var(--color-accent)" opacity=".9" />
            <circle cx={x} cy={y} r="1.6" fill="var(--color-primary)" />
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- BandBaajaMarquee — celebratory scrolling text band ---------- */
export function BandBaajaMarquee({
  text = "शुभ विवाह",
  separator = "✦",
  duration = 18,
  className = "",
}: {
  text?: string;
  separator?: string;
  duration?: number;
  className?: string;
}) {
  const items = Array.from({ length: 10 }, () => text);
  return (
    <div className={`overflow-hidden border-y border-ornate/50 bg-primary py-2 ${className}`} aria-hidden>
      <div className="marquee-x flex w-max gap-6 whitespace-nowrap" style={{ ["--marquee-duration" as string]: `${duration}s` } as CSSProperties}>
        {[...items, ...items].map((t, i) => (
          <span key={i} className="font-display text-lg font-semibold tracking-wider text-bg">
            {t} <span className="ml-6 text-accent">{separator}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- HaldiSplash — organic turmeric-paste blob backdrop ---------- */
export function HaldiSplash({ className = "", children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={`relative ${className}`}>
      <svg aria-hidden viewBox="0 0 200 200" className="absolute inset-0 size-full text-accent/25">
        <path
          d="M100 12c30-6 62 8 74 34s6 60-14 80-56 26-84 14S18 96 24 64 70 18 100 12Z"
          fill="currentColor"
        />
        <circle cx="168" cy="52" r="7" fill="currentColor" />
        <circle cx="36" cy="150" r="5" fill="currentColor" />
        <circle cx="176" cy="140" r="4" fill="currentColor" />
      </svg>
      <div className="relative p-10">{children}</div>
    </div>
  );
}

/* ---------- KaleeraTassel — hanging bridal tassel ---------- */
export function KaleeraTassel({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 48 96" className={`swing-hang text-accent ${className}`}>
      <line x1="24" y1="0" x2="24" y2="18" stroke="currentColor" strokeWidth="2" />
      <path d="M12 18h24l-3 14H15l-3-14Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 32v22m8-22v26m8-26v22" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="58" r="3" fill="currentColor" />
      <circle cx="24" cy="62" r="3" fill="currentColor" />
      <circle cx="32" cy="58" r="3" fill="currentColor" />
      <path d="M16 61v10m8 -5v10m8-15v10" stroke="currentColor" strokeWidth="1.4" opacity=".7" />
    </svg>
  );
}

/* ---------- SehraFringe — beaded fringe strip for header bottoms ---------- */
export function SehraFringe({ strands = 14, className = "" }: { strands?: number; className?: string }) {
  return (
    <svg aria-hidden viewBox={`0 0 ${strands * 16} 56`} preserveAspectRatio="none" className={`w-full text-ornate ${className}`}>
      <rect width={strands * 16} height="5" fill="currentColor" />
      {Array.from({ length: strands }).map((_, i) => {
        const x = 8 + i * 16;
        const len = 30 + ((i * 13) % 16);
        return (
          <g key={i}>
            <line x1={x} y1="5" x2={x} y2={5 + len} stroke="currentColor" strokeWidth="1.6" />
            <circle cx={x} cy={9 + len} r="2.6" fill="var(--color-primary)" />
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- MandapCanopy — four-post canopy header decoration ---------- */
export function MandapCanopy({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <svg aria-hidden viewBox="0 0 400 70" preserveAspectRatio="none" className="w-full text-ornate">
        <path d="M8 70V26L200 6l192 20v44" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M8 26h384" stroke="currentColor" strokeWidth="2" />
        {[60, 130, 200, 270, 340].map((x) => (
          <g key={x}>
            <path d={`M${x} 26c-5 8-5 14 0 20c5-6 5-12 0-20Z`} fill="currentColor" opacity=".8" />
          </g>
        ))}
        <circle cx="200" cy="6" r="3" fill="currentColor" />
      </svg>
      {children && <div className="px-6 pt-2">{children}</div>}
    </div>
  );
}

/* ---------- RangoliMedallion — radial rangoli centrepiece ---------- */
export function RangoliMedallion({ size = 160, className = "" }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 120" width={size} height={size} className={`text-accent ${className}`}>
      <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".5" />
      <circle cx="60" cy="60" r="44" fill="none" stroke="currentColor" strokeWidth="1.2" />
      {Array.from({ length: 12 }).map((_, i) => (
        <g key={i} transform={`rotate(${i * 30} 60 60)`}>
          <path d="M60 6c4 6 4 12 0 17-4-5-4-11 0-17Z" fill="currentColor" opacity=".85" />
          <circle cx="60" cy="30" r="2" fill="var(--color-primary)" />
        </g>
      ))}
      <circle cx="60" cy="60" r="16" fill="none" stroke="var(--color-primary)" strokeWidth="1.6" />
      <circle cx="60" cy="60" r="5" fill="currentColor" />
    </svg>
  );
}

/* ---------- ScrollCard — royal khat with rolled ends ---------- */
export function ScrollCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-x-0 top-0 h-5 rounded-pill bg-primary shadow-resting" />
      <div className="paper-texture relative mx-3 border-x border-ornate/40 px-6 py-8 shadow-envelope">
        {children}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-5 rounded-pill bg-primary shadow-resting" />
    </div>
  );
}

/* ---------- TicketCard — baraat boarding-pass with perforation ---------- */
export function TicketCard({
  left,
  right,
  className = "",
}: {
  left: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex overflow-hidden rounded-card border border-ornate/50 bg-surface shadow-resting ${className}`}>
      <div className="flex-1 p-5">{left}</div>
      <div aria-hidden className="relative w-px self-stretch border-l-2 border-dashed border-ornate/60">
        <span className="absolute -left-2.5 -top-2.5 size-5 rounded-full bg-bg border border-ornate/50" />
        <span className="absolute -bottom-2.5 -left-2.5 size-5 rounded-full bg-bg border border-ornate/50" />
      </div>
      <div className="flex w-28 shrink-0 items-center justify-center bg-accent/10 p-4 text-center">{right}</div>
    </div>
  );
}

/* ---------- FoldCard — tri-fold card that opens on hover/focus ---------- */
export function FoldCard({ cover, children, className = "" }: { cover: ReactNode; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      className={`relative block w-full cursor-pointer text-left ${className}`}
      style={{ perspective: 1000 }}
    >
      <div className="ornate-border rounded-card bg-surface p-6 shadow-resting">{children}</div>
      <motion.div
        animate={{ rotateY: open ? -140 : 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "left center", transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
        className="paper-texture absolute inset-0 flex items-center justify-center rounded-card border border-ornate/50 shadow-lifted"
      >
        {cover}
      </motion.div>
    </button>
  );
}

/* ---------- PolaroidStack — fanned photo pile ---------- */
export function PolaroidStack({ seeds, className = "" }: { seeds: string[]; className?: string }) {
  const angles = [-7, 4, -2, 8, -5];
  return (
    <div className={`relative inline-block ${className}`} style={{ width: 220, height: 240 }}>
      {seeds.slice(0, 5).map((seed, i) => (
        <div
          key={seed}
          className="absolute transition-transform duration-300 hover:z-10 hover:scale-105 hover:rotate-0"
          style={{ transform: `rotate(${angles[i % angles.length]}deg)`, left: i * 6, top: i * 4 }}
        >
          <PhotoFrame seed={seed} variant="polaroid" width={170} height={150} />
        </div>
      ))}
    </div>
  );
}
