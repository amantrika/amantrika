"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { OpenStyle, Theme } from "@/themes";
import { motifs } from "../motifs";
import { icons } from "../icons";
import { Envelope } from "./Envelope";
import { CoupleMonogram } from "./CoupleMonogram";
import { PatternBackground } from "../patterns";

/**
 * ThemedOpening — the invitation's grand opening moment, different for every
 * theme. Royal Maroon breaks a wax seal; Haldi bursts marigolds; Peacock fans
 * a feather; Temple South swings carved doors; Nikah parts jaali gates;
 * Mehndi Nights lifts a night curtain; Anand Karaj draws a phulkari curtain;
 * Cathedral White opens church doors.
 *
 * Under prefers-reduced-motion every style resolves instantly via onOpened.
 * @example <ThemedOpening theme={theme} guestName="Rahul & Family" onOpened={fn} />
 */
export function ThemedOpening({
  theme,
  guestName,
  initials,
  onOpened,
  style,
  className = "",
}: {
  theme: Theme;
  guestName?: string;
  initials?: [string, string];
  onOpened?: () => void;
  /** override the theme's own openStyle (used by the docs gallery) */
  style?: OpenStyle;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [opening, setOpening] = useState(false);
  const kind = style ?? theme.openStyle;
  const pair: [string, string] = initials ?? ["S", "P"];

  const begin = () => {
    if (opening) return;
    setOpening(true);
    setTimeout(() => onOpened?.(), reduced ? 60 : 1900);
  };

  /* The envelope theme keeps the original interactive envelope. */
  if (kind === "envelope-seal") {
    return (
      <div className={className}>
        <Envelope guestName={guestName} sealMonogram={`${pair[0]}·${pair[1]}`} onOpened={onOpened} />
      </div>
    );
  }

  return (
    <div className={`relative mx-auto w-full max-w-md ${className}`} style={{ perspective: 1400 }}>
      <button
        onClick={begin}
        disabled={opening}
        aria-label={opening ? "Invitation opening" : `Open invitation${guestName ? ` for ${guestName}` : ""}`}
        className="relative block aspect-[7/9] w-full cursor-pointer overflow-hidden rounded-card shadow-lifted"
      >
        {/* the card revealed underneath every opening style */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 ${theme.texture} px-6 text-center`}>
          <PatternBackground name={theme.pattern} className="text-accent opacity-[0.07]" />
          <CoupleMonogram initials={pair} ring={theme.monogramRing} className="relative size-20 text-accent" />
          <p className="relative type-greeting text-lg text-accent" dir={theme.greetingScript === "arabic" ? "rtl" : undefined}>
            {theme.greetingCopy}
          </p>
          <p className="relative type-display-lg text-primary" style={{ fontSize: "clamp(1.75rem,7vw,2.5rem)" }}>
            {pair[0]} <span className="type-accent-face text-accent">&amp;</span> {pair[1]}
          </p>
          {guestName && <p className="relative type-caption">Dear {guestName}</p>}
        </div>

        <AnimatePresence>{!opening && <OpeningCover kind={kind} theme={theme} guestName={guestName} />}</AnimatePresence>
      </button>
    </div>
  );
}

/* ---------------- the per-theme covers ---------------- */

function CoverShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`absolute inset-0 ${className}`}>{children}</div>;
}

function Prompt({ label = "Tap to open", sub }: { label?: string; sub?: string }) {
  return (
    <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-1">
      {sub && <p className="type-accent-face text-xl text-bg/90">{sub}</p>}
      <p className="type-overline !text-bg/80">{label}</p>
    </div>
  );
}

function OpeningCover({
  kind,
  theme,
  guestName,
}: {
  kind: OpenStyle;
  theme: Theme;
  guestName?: string;
}) {
  const Accent = motifs[theme.motifSet.accent];
  const Corner = motifs[theme.motifSet.corner];
  const ease = [0.22, 1, 0.36, 1] as const;

  /* ---- marigold-burst: petals explode outward, cover scales away ---- */
  if (kind === "marigold-burst") {
    const Marigold = motifs.marigold;
    return (
      <CoverShell>
        <motion.div
          exit={{ scale: 1.35, opacity: 0, transition: { duration: 0.9, ease } }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-4"
          style={{ background: "var(--gradient-royal)" }}
        >
          <motion.div exit={{ rotate: 200, scale: 0.3, opacity: 0, transition: { duration: 0.9, ease } }}>
            <Marigold className="size-24 text-bg" />
          </motion.div>
          <p className="type-greeting px-8 text-center text-2xl text-bg">{theme.greetingCopy}</p>
          <Prompt label="Tap for the haldi" sub={guestName} />
        </motion.div>
        {/* petals flying out */}
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2"
            exit={{
              x: Math.cos((i / 14) * Math.PI * 2) * 260,
              y: Math.sin((i / 14) * Math.PI * 2) * 320,
              rotate: 260,
              opacity: 0,
              transition: { duration: 1.1, ease: "easeOut" },
            }}
          >
            <Marigold className="size-6 text-accent" />
          </motion.span>
        ))}
      </CoverShell>
    );
  }

  /* ---- feather-fan: peacock feathers fan open like a hand of cards ---- */
  if (kind === "feather-fan") {
    const Feather = motifs["peacock-feather"];
    return (
      <CoverShell className="overflow-hidden">
        <motion.div
          exit={{ opacity: 0, transition: { duration: 0.8, delay: 0.35 } }}
          className="absolute inset-0"
          style={{ background: "var(--gradient-royal)" }}
        />
        {[-40, -20, 0, 20, 40].map((deg, i) => (
          <motion.div
            key={deg}
            className="absolute bottom-24 left-1/2 -ml-20 origin-bottom"
            initial={{ rotate: deg * 0.2, y: 30 }}
            animate={{ rotate: deg * 0.35, y: 0, transition: { duration: 0.8, delay: i * 0.06, ease } }}
            exit={{ rotate: deg * 2.4, y: -40, opacity: 0, transition: { duration: 0.95, delay: i * 0.05, ease } }}
          >
            <Feather className="size-40 text-accent" />
          </motion.div>
        ))}
        <motion.div exit={{ opacity: 0, transition: { duration: 0.4 } }} className="absolute inset-0">
          <Prompt label="Tap to unfurl" sub={guestName} />
        </motion.div>
      </CoverShell>
    );
  }

  /* ---- temple-doors / cathedral-doors / jaali-gates: two leaves swing open ---- */
  if (kind === "temple-doors" || kind === "cathedral-doors" || kind === "jaali-gates") {
    const isArch = kind !== "jaali-gates";
    const LeafMotif = kind === "jaali-gates" ? motifs["jaali-pattern"] : kind === "cathedral-doors" ? motifs["church-arch"] : motifs.kalash;
    return (
      <CoverShell>
        {(["left", "right"] as const).map((side) => (
          <motion.div
            key={side}
            className="absolute inset-y-0 w-1/2 overflow-hidden border-ornate/60"
            style={{
              [side]: 0,
              transformOrigin: side === "left" ? "left center" : "right center",
              transformStyle: "preserve-3d",
              background: "var(--gradient-royal)",
              borderRightWidth: side === "left" ? 1 : 0,
              borderLeftWidth: side === "right" ? 1 : 0,
              borderTopLeftRadius: isArch && side === "left" ? "60% 22%" : undefined,
              borderTopRightRadius: isArch && side === "right" ? "60% 22%" : undefined,
            }}
            exit={{
              rotateY: side === "left" ? 88 : -88,
              transition: { duration: 1.2, ease },
            }}
          >
            {/* carved panel detail */}
            <PatternBackground name={theme.pattern} className="text-bg opacity-20" />
            <div className="absolute inset-4 rounded-soft border border-bg/25" />
            <div className="absolute inset-6 rounded-soft border border-accent/25" />
            <div className="absolute inset-7 flex items-center justify-center">
              <LeafMotif className="size-24 text-accent/70" />
            </div>
            <Corner className={`absolute size-8 text-bg/35 ${side === "left" ? "left-2 top-2" : "right-2 top-2 -scale-x-100"}`} />
            {/* door handle ring */}
            <span
              className="absolute top-1/2 size-5 -translate-y-1/2 rounded-full border-2 border-accent"
              style={{ [side === "left" ? "right" : "left"]: 10 } as React.CSSProperties}
            />
          </motion.div>
        ))}
        <motion.div exit={{ opacity: 0, transition: { duration: 0.35 } }} className="absolute inset-0">
          {/* the greeting sits across the closed doors, like carved lettering */}
          <p
            className="absolute inset-x-6 top-[22%] type-greeting text-center text-xl text-bg"
            dir={theme.greetingScript === "arabic" ? "rtl" : undefined}
          >
            {theme.greetingCopy}
          </p>
          <Prompt
            label={kind === "jaali-gates" ? "Tap to part the jaali" : "Tap to open the doors"}
            sub={guestName}
          />
        </motion.div>
      </CoverShell>
    );
  }

  /* ---- night-curtain: starry drape lifts upward ---- */
  if (kind === "night-curtain") {
    const Crescent = motifs["crescent-star"];
    return (
      <CoverShell>
        <motion.div
          className="absolute inset-0 overflow-hidden"
          style={{ background: "var(--gradient-royal)" }}
          exit={{ y: "-100%", transition: { duration: 1.25, ease } }}
        >
          <PatternBackground name="night-sky" className="text-bg opacity-25" />
          {/* drape folds */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "repeating-linear-gradient(90deg, color-mix(in srgb, black 16%, transparent) 0 6px, transparent 6px 34px)",
            }}
          />
          <div className="absolute inset-x-0 top-1/3 flex flex-col items-center gap-3">
            <Crescent className="size-16 text-accent" />
            <p className="type-accent-face px-8 text-center text-2xl text-bg">{theme.greetingCopy}</p>
          </div>
          <Prompt label="Tap to lift the veil" sub={guestName} />
        </motion.div>
        {/* dupatta fringe on the hem */}
        <motion.div className="absolute inset-x-0 top-0" exit={{ y: "-100%", transition: { duration: 1.25, ease } }} />
      </CoverShell>
    );
  }

  /* ---- phulkari-curtain: embroidered panels slide apart sideways ---- */
  if (kind === "phulkari-curtain") {
    const Khanda = icons.khanda;
    return (
      <CoverShell>
        {(["left", "right"] as const).map((side) => (
          <motion.div
            key={side}
            className="absolute inset-y-0 w-1/2 overflow-hidden"
            style={{ [side]: 0, background: "var(--gradient-royal)" }}
            exit={{ x: side === "left" ? "-100%" : "100%", transition: { duration: 1.1, ease } }}
          >
            <PatternBackground name="phulkari" className="text-bg opacity-30" />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: "repeating-linear-gradient(90deg, color-mix(in srgb, black 12%, transparent) 0 4px, transparent 4px 28px)" }}
            />
          </motion.div>
        ))}
        <motion.div exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.7 } }} className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Khanda className="size-20 text-accent" />
          <p className="type-greeting px-8 text-center text-xl text-bg">{theme.greetingCopy}</p>
          <Prompt label="Tap to draw the curtain" sub={guestName} />
        </motion.div>
      </CoverShell>
    );
  }

  /* ---- fallback: an iris that opens from the centre ---- */
  return (
    <CoverShell>
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center gap-4"
        style={{ background: "var(--gradient-royal)" }}
        exit={{ clipPath: "circle(0% at 50% 50%)", transition: { duration: 1, ease } }}
      >
        <Accent className="size-20 text-accent" />
        <p className="type-greeting px-8 text-center text-xl text-bg">{theme.greetingCopy}</p>
        <Prompt sub={guestName} />
      </motion.div>
    </CoverShell>
  );
}

/** Human-readable labels for the docs gallery. */
export const openStyleLabels: Record<OpenStyle, string> = {
  "envelope-seal": "Envelope & wax seal",
  "marigold-burst": "Marigold burst",
  "feather-fan": "Peacock feather fan",
  "temple-doors": "Carved temple doors",
  "jaali-gates": "Jaali gates",
  "night-curtain": "Night curtain lift",
  "phulkari-curtain": "Phulkari curtain",
  "cathedral-doors": "Cathedral doors",
};
