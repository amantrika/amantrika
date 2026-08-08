import type { PatternName } from "@/design-system/patterns";
import type { ContentWidth, Rhythm, Surface } from "@/design-system/tokens/layout";

/**
 * THE LAYOUT MODEL
 *
 * A theme used to be a palette: same page, different colours. This file is what
 * makes two themes render the same invitation as two different documents —
 * different sections, in a different order, on different backgrounds, at a
 * different cadence.
 *
 * The renderer reads this and nothing else. Per operating rule 5, no code
 * anywhere may branch on a theme id: if a theme needs to look different, it
 * needs a field here, not an `if`.
 */

/**
 * Every section an invitation can contain. The hero is not in this list — it is
 * always first and always present, and varies by `hero` variant instead.
 *
 * Adding a member here is a two-file change: declare it, then register how to
 * render it in the invite section registry. A section whose data is missing is
 * skipped at render time, so a theme may list sections a given invitation
 * doesn't fill.
 */
export const sectionIds = [
  "verse",
  "countdown",
  "story",
  "film",
  "events",
  "family",
  "gallery",
  "rsvp",
  "blessings",
  "travel",
  "gift",
] as const;
export type SectionId = (typeof sectionIds)[number];

/**
 * How the opening spread is built. This is the single biggest driver of a
 * theme's character, because it is the only thing most guests see before
 * deciding whether to scroll.
 */
export const heroVariants = [
  /** Monogram, greeting, names stacked dead centre. The classic card. */
  "centered-monogram",
  /** Names inside a Mughal/temple arch cut into a patterned ground. */
  "arch-window",
  /** Photograph on one side, names on the other; stacks on mobile. */
  "split-portrait",
  /** Photograph edge to edge with the names over a scrim. */
  "full-bleed-photo",
  /** A horizontal banner of names over a repeating motif band. */
  "banner-scroll",
  /** Type only, enormous, almost no ornament. */
  "minimal-type",
  /** Scripture or greeting line first, names second and smaller. */
  "verse-first",
] as const;
export type HeroVariant = (typeof heroVariants)[number];

/** How a section announces itself. */
export const headingStyles = [
  "overline-title",
  "title-only",
  /** "01 —" before the title; reads as an itinerary. */
  "numbered",
  /** Small caps title with a rule running through it. */
  "rule-through",
  "none",
] as const;
export type HeadingStyle = (typeof headingStyles)[number];

export type DividerStyle = "motif" | "rule" | "none";

/** `theme` resolves to the theme's own signature pattern. */
export type SectionPattern = PatternName | "theme" | "none";

export interface SectionStyle {
  surface: Surface;
  width: ContentWidth;
  pattern: SectionPattern;
  align: "center" | "left";
  heading: HeadingStyle;
  /** Ornament placed above the section header. */
  divider: DividerStyle;
}

export interface ThemeLayout {
  hero: HeroVariant;
  /** Vertical cadence for the whole invitation. */
  rhythm: Rhythm;
  /** The default column width; individual sections may override. */
  contentWidth: ContentWidth;
  /** How much decoration the theme tolerates outside the hero. */
  ornament: "none" | "light" | "rich";
  /** Section order. Anything omitted is not rendered for this theme at all. */
  order: SectionId[];
  /** Per-section deviations from `defaults` below. */
  sections?: Partial<Record<SectionId, Partial<SectionStyle>>>;
  footer: "minimal" | "centered" | "ornate";
}

/**
 * What a section looks like when a theme says nothing about it. Deliberately
 * plain: every visible difference should be a decision someone made in
 * `themes/index.ts`, not an accident of the default.
 */
export const defaultSectionStyle: SectionStyle = {
  surface: "plain",
  width: "regular",
  pattern: "none",
  align: "center",
  heading: "overline-title",
  divider: "motif",
};

/**
 * Merge a theme's per-section overrides onto the defaults, with the theme's own
 * `contentWidth` standing in for the width unless the section overrides it.
 */
export function resolveSectionStyle(layout: ThemeLayout, id: SectionId): SectionStyle {
  const override = layout.sections?.[id] ?? {};
  return {
    ...defaultSectionStyle,
    width: layout.contentWidth,
    // A theme that suppresses ornament suppresses it everywhere, so `ornament:
    // "none"` doesn't have to be repeated as `divider: "none"` on ten sections.
    divider: layout.ornament === "none" ? "none" : defaultSectionStyle.divider,
    ...override,
  };
}
