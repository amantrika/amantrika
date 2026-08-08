"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { SectionStyle, Theme } from "@/themes";
import { PatternBackground } from "../patterns";
import { fadeUpStagger, staggerContainer } from "../motion/presets";
import { Divider } from "./bits";

/**
 * The one section shell every invitation section goes through.
 *
 * It takes a resolved `SectionStyle` — surface, width, pattern, alignment,
 * heading treatment, divider — and renders it. No section decides its own
 * background or width; the theme does, in `src/themes/index.ts`. That is the
 * whole point: swapping the theme reshapes the page rather than recolouring it.
 *
 * `ThemedSection` (in ./sections.tsx) is the older, simpler shell and is still
 * used by the design-system docs. This one supersedes it on the invite route.
 */
export function LayoutSection({
  id,
  theme,
  style,
  overline,
  title,
  index,
  children,
  className = "",
}: {
  id: string;
  theme: Theme;
  style: SectionStyle;
  overline?: string;
  title?: string;
  /** Position in the theme's section order — only used by `numbered` headings. */
  index?: number;
  children: ReactNode;
  className?: string;
}) {
  const pattern =
    style.pattern === "none" ? null : style.pattern === "theme" ? theme.pattern : style.pattern;

  // A tinted/inverted/panel ground swallows a faint wash, so patterns get their
  // own stronger opacity token there rather than a hardcoded bump.
  const onPanel = style.surface !== "plain";

  return (
    <motion.section
      id={id}
      data-surface={style.surface}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className={`section-shell ${className}`}
    >
      {pattern && (
        <PatternBackground
          name={pattern}
          className="text-accent"
          style={{
            opacity: `var(${onPanel ? "--pattern-opacity-panel" : "--pattern-opacity"})`,
            zIndex: "var(--z-pattern)",
          }}
        />
      )}

      <div className="section-column" data-width={style.width}>
        {style.divider === "motif" && (
          <Divider variant="motif" motif={theme.motifSet.divider} className="mb-10" />
        )}
        {style.divider === "rule" && <Divider className="mb-10" />}

        {title && style.heading !== "none" && (
          <motion.div variants={fadeUpStagger}>
            <SectionTitle
              style={style}
              overline={overline}
              title={title}
              index={index}
              className="mb-8"
            />
          </motion.div>
        )}

        {children}
      </div>
    </motion.section>
  );
}

/**
 * The four ways a section can announce itself. Kept next to the shell because
 * the choice is part of the layout vocabulary, not a per-section decision.
 */
export function SectionTitle({
  style,
  overline,
  title,
  index,
  className = "",
}: {
  style: SectionStyle;
  overline?: string;
  title: string;
  index?: number;
  className?: string;
}) {
  const align = style.align === "center" ? "text-center" : "text-left";

  if (style.heading === "numbered") {
    return (
      <header className={`${align} ${className}`}>
        <p className="type-overline">
          {String((index ?? 0) + 1).padStart(2, "0")}
          <span className="mx-2 opacity-50">—</span>
          {overline ?? title}
        </p>
        <h2 className="mt-2 type-display-lg text-primary">{title}</h2>
      </header>
    );
  }

  if (style.heading === "rule-through") {
    return (
      <header className={`${className} flex items-center gap-4`}>
        {style.align === "center" && <span className="gold-rule flex-1" />}
        <h2 className="type-h1 whitespace-nowrap text-primary">{title}</h2>
        <span className="gold-rule flex-1" />
      </header>
    );
  }

  if (style.heading === "title-only") {
    return (
      <header className={`${align} ${className}`}>
        <h2 className="type-display-lg text-primary">{title}</h2>
      </header>
    );
  }

  return (
    <header className={`${align} ${className}`}>
      {overline && <p className="type-overline">{overline}</p>}
      <h2 className="mt-1 type-display-lg text-primary">{title}</h2>
    </header>
  );
}
