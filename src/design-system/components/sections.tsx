"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { Theme } from "@/themes";
import { motifs } from "../motifs";
import { PatternBackground } from "../patterns";
import { fadeUpStagger, staggerContainer } from "../motion/presets";
import { DecorativeBorder } from "./borders";
import { Divider } from "./bits";
import { PhotoFrame } from "./PhotoFrame";
import { ConnectedTimeline, type TimelineEntry } from "./timeline";
import { DropCap } from "./typography";

/**
 * SECTION SHELLS — reusable page sections that already know the active theme.
 * These are the pieces the invite page composes, so a theme's border style,
 * texture, pattern and fonts apply everywhere without per-page wiring.
 */

/* ---------- SectionHeader — overline + display title + motif divider ---------- */
export function SectionHeader({
  overline,
  title,
  subtitle,
  motif,
  align = "center",
  className = "",
}: {
  overline?: string;
  title: string;
  subtitle?: string;
  motif?: Parameters<typeof Divider>[0]["motif"];
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <header className={`${align === "center" ? "text-center" : ""} ${className}`}>
      {overline && <p className="type-overline">{overline}</p>}
      <h2 className="mt-1 type-display-lg text-primary">{title}</h2>
      {subtitle && <p className="mx-auto mt-2 max-w-xl type-accent-face text-xl text-muted">{subtitle}</p>}
      {motif && <Divider variant="motif" motif={motif} className={`mt-5 ${align === "center" ? "mx-auto max-w-sm" : "max-w-sm"}`} />}
    </header>
  );
}

/* ---------- ThemedSection — scroll-revealed section with the theme's rhythm ---------- */
export function ThemedSection({
  id,
  theme,
  overline,
  title,
  subtitle,
  /** wash the section background with the theme pattern */
  patterned = false,
  /** apply the theme's material to the section background */
  textured = false,
  children,
  className = "",
}: {
  id?: string;
  theme: Theme;
  overline?: string;
  title?: string;
  subtitle?: string;
  patterned?: boolean;
  textured?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      id={id}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className={`relative ${textured ? theme.texture : ""} ${className}`}
      style={{ paddingTop: "var(--space-section-gap)" }}
    >
      {patterned && <PatternBackground name={theme.pattern} className="text-accent opacity-[0.06]" />}
      <div className="relative mx-auto w-full max-w-4xl px-4">
        <Divider variant="motif" motif={theme.motifSet.divider} className="mb-10" />
        {title && (
          <motion.div variants={fadeUpStagger}>
            <SectionHeader overline={overline} title={title} subtitle={subtitle} className="mb-8" />
          </motion.div>
        )}
        {children}
      </div>
    </motion.section>
  );
}

/* ---------- ThemedCard — a card wearing the theme's border + material ---------- */
export function ThemedCard({
  theme,
  children,
  patterned = false,
  className = "",
}: {
  theme: Theme;
  children: ReactNode;
  patterned?: boolean;
  className?: string;
}) {
  return (
    <DecorativeBorder variant={theme.borderStyle} className={`relative overflow-hidden ${theme.texture} ${className}`}>
      {patterned && <PatternBackground name={theme.pattern} className="text-accent opacity-[0.07]" />}
      <div className="relative">{children}</div>
    </DecorativeBorder>
  );
}

/* ---------- ThemedHero — the invite's opening spread ---------- */
export function ThemedHero({
  theme,
  names,
  initials,
  dateLabel,
  city,
  hashtag,
  guestName,
  joiner = "weds",
  children,
  className = "",
}: {
  theme: Theme;
  /** One name for a solo celebration, two for a wedding, more for a joint event. */
  names: string[];
  initials?: [string, string];
  dateLabel: string;
  city: string;
  hashtag?: string;
  guestName?: string;
  /** Word set between the first two names. "weds" for a wedding, "&" elsewhere. */
  joiner?: string;
  /** monogram or other ornament slot */
  children?: ReactNode;
  className?: string;
}) {
  const Accent = motifs[theme.motifSet.accent];
  return (
    <section className={`relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-4 pt-16 text-center ${theme.texture} ${className}`}>
      <PatternBackground name={theme.pattern} className="text-accent opacity-[0.07]" />
      <div className="relative flex flex-col items-center">
        {children ?? <Accent className="size-20 text-accent" />}
        <p
          className="mt-6 type-greeting text-2xl text-accent"
          dir={theme.greetingScript === "arabic" ? "rtl" : undefined}
        >
          {theme.greetingCopy}
        </p>
        <h1 className="mt-4 type-display-xl text-primary">
          {names[0]}
          {names.slice(1).map((name, i) => (
            <span key={name}>
              <span
                className="mx-3 type-accent-face text-accent sm:mx-5"
                style={{ fontSize: "0.5em" }}
              >
                {i === 0 ? joiner : "&"}
              </span>
              {name}
            </span>
          ))}
        </h1>
        {guestName && <p className="mt-4 type-accent-face text-xl text-muted">Dear {guestName}, we would be honoured by your presence.</p>}
        <p className="mt-6 type-overline">{dateLabel} · {city}</p>
        {hashtag && <p className="mt-2 type-body-lg text-muted">{hashtag}</p>}
        {initials && <span className="sr-only">{initials.join(" and ")}</span>}
      </div>
    </section>
  );
}

/* ---------- OurStorySection — the full "how we met" spread ---------- */
export function OurStorySection({
  theme,
  story,
  moments,
  photos,
  className = "",
}: {
  theme: Theme;
  story: string;
  moments: { title: string; text: string }[];
  /** Up to two photo URLs. Fewer simply renders fewer frames. */
  photos: string[];
  className?: string;
}) {
  return (
    <div className={className}>
      <motion.div variants={fadeUpStagger}>
        <DropCap className="mx-auto max-w-2xl text-center">{story}</DropCap>
      </motion.div>

      <motion.div variants={fadeUpStagger} custom={1} className="mt-10 flex flex-wrap items-end justify-center gap-8">
        {photos.slice(0, 2).map((url, i) => (
          <PhotoFrame
            key={url}
            src={url}
            variant={theme.frameStyle}
            width={260}
            height={330}
            caption={i === 0 ? "How it started" : "How it's going"}
          />
        ))}
      </motion.div>

      <motion.div variants={fadeUpStagger} custom={2} className="mx-auto mt-12 max-w-xl">
        <ConnectedTimeline
          entries={moments.map((m, i): TimelineEntry => ({
            icon: (["chai-kulhad", "rings", "garland", "mithai"] as const)[i % 4],
            title: m.title,
            description: m.text,
          }))}
        />
      </motion.div>
    </div>
  );
}
