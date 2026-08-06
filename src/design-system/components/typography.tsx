"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";

/**
 * Typographic components: multi-script headings, calligraphy, verses,
 * kinetic text. Fonts come from the token layer (see layout.tsx).
 */

/* ---------- ScriptText — Great Vibes calligraphy ---------- */
export function ScriptText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`type-script text-primary ${className}`}>{children}</span>;
}

/* ---------- BilingualHeading — English display over a Hindi line ---------- */
export function BilingualHeading({
  english,
  hindi,
  align = "center",
  className = "",
}: {
  english: string;
  hindi?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={`${align === "center" ? "text-center" : ""} ${className}`}>
      {hindi && <p className="type-deva-display text-xl text-accent">{hindi}</p>}
      <h2 className="mt-1 type-display-lg text-primary">{english}</h2>
    </div>
  );
}

/* ---------- UrduVerse — Nastaliq couplet, right-to-left ---------- */
export function UrduVerse({ lines, attribution, className = "" }: { lines: string[]; attribution?: string; className?: string }) {
  return (
    <blockquote dir="rtl" className={`text-center ${className}`}>
      {lines.map((l) => (
        <p key={l} className="type-nastaliq text-xl leading-loose text-primary">
          {l}
        </p>
      ))}
      {attribution && <footer className="mt-2 type-caption" dir="ltr">— {attribution}</footer>}
    </blockquote>
  );
}

/* ---------- VerseBlock — shayari/poem between gold quotes ---------- */
export function VerseBlock({ children, attribution, className = "" }: { children: ReactNode; attribution?: string; className?: string }) {
  return (
    <blockquote className={`relative mx-auto max-w-lg px-10 py-4 text-center ${className}`}>
      <span aria-hidden className="absolute left-0 top-0 font-display text-6xl leading-none text-accent/60">“</span>
      <p className="type-verse text-primary">{children}</p>
      <span aria-hidden className="absolute bottom-0 right-0 font-display text-6xl leading-none text-accent/60">”</span>
      {attribution && <footer className="mt-3 type-overline">{attribution}</footer>}
    </blockquote>
  );
}

/* ---------- DropCap — illuminated first letter ---------- */
export function DropCap({ children, className = "" }: { children: string; className?: string }) {
  const [first, ...rest] = children;
  return (
    <p className={`type-body-lg ${className}`}>
      <span className="float-left mr-2 mt-1 font-display text-6xl font-semibold leading-[0.8] text-accent">{first}</span>
      {rest.join("")}
    </p>
  );
}

/* ---------- WaveText — per-letter rising reveal ---------- */
export function WaveText({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <span ref={ref} aria-label={text} className={`inline-block ${className}`}>
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block whitespace-pre"
          initial={{ y: "0.6em", opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : {}}
          transition={{ delay: i * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

/* ---------- TypewriterText — character-by-character reveal ---------- */
export function TypewriterText({ text, speed = 45, className = "" }: { text: string; speed?: number; className?: string }) {
  const [len, setLen] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const t = setInterval(() => setLen((l) => (l >= text.length ? l : l + 1)), speed);
    return () => clearInterval(t);
  }, [inView, text.length, speed]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      {text.slice(0, len)}
      {len < text.length && <span className="gentle-pulse text-accent">|</span>}
    </span>
  );
}

/* ---------- AnimatedCounter — count-up display number ---------- */
export function AnimatedCounter({ to, duration = 1.4, suffix = "", className = "" }: { to: number; duration?: number; suffix?: string; className?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / (duration * 1000));
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className={`font-display font-semibold tabular-nums text-primary ${className}`}>
      {value.toLocaleString()}{suffix}
    </span>
  );
}

/* ---------- KineticUnderline — heading with drawn gold underline ---------- */
export function KineticUnderline({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`kinetic-underline inline-block ${className}`}>{children}</span>;
}
