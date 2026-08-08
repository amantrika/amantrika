/**
 * Layout tokens — the vocabulary a theme uses to describe *structure* rather
 * than colour. Section order and per-section styling live in
 * `src/themes/layout.ts`; this file holds the primitive scales those choices
 * are drawn from, and the CSS variables that back them.
 *
 * Nothing here is a component decision. `contentWidths` says how wide "narrow"
 * is; which sections are narrow is the theme's business.
 */

/** Column widths a section can be constrained to. `full` bleeds edge to edge. */
export const contentWidths = {
  narrow: { css: "var(--width-narrow)", note: "40rem — verse, story, single-column reading" },
  regular: { css: "var(--width-regular)", note: "56rem — the default invitation column" },
  wide: { css: "var(--width-wide)", note: "72rem — galleries, timelines, maps side by side" },
  full: { css: "none", note: "edge to edge; the section supplies its own padding" },
} as const;
export type ContentWidth = keyof typeof contentWidths;

/**
 * Vertical rhythm multiplier. Applied to `--rhythm-scale`, which scales both
 * `--space-section-gap` and `--space-block-gap`, so a theme is consistently
 * dense or airy at every level rather than only between sections.
 */
export const rhythms = {
  dense: { scale: 0.85, note: "festive themes — content close together, busy and warm" },
  balanced: { scale: 1, note: "the default cadence" },
  airy: { scale: 1.18, note: "minimal themes — long silences between sections" },
  cathedral: { scale: 1.35, note: "maximum stillness; very few sections" },
} as const;
export type Rhythm = keyof typeof rhythms;

/**
 * Section backgrounds. Implemented as `[data-surface]` blocks in globals.css —
 * `inverted` redeclares the semantic colour tokens, so anything inside it stays
 * legible without knowing it is on a dark panel.
 */
export const surfaces = {
  plain: { note: "page background; no edges" },
  panel: { note: "raised surface with hairline rules top and bottom" },
  tinted: { note: "primary washed into the page background at 6%" },
  inverted: { note: "primary becomes the ground, background becomes the ink" },
} as const;
export type Surface = keyof typeof surfaces;

/**
 * Stacking order. Named so no component has to invent a z-index; anything
 * that needs to sit above `toast` belongs to the browser, not to us.
 */
export const zLayers = {
  base: "var(--z-base)",
  pattern: "var(--z-pattern)",
  content: "var(--z-content)",
  sticky: "var(--z-sticky)",
  navbar: "var(--z-navbar)",
  dropdown: "var(--z-dropdown)",
  overlay: "var(--z-overlay)",
  toast: "var(--z-toast)",
} as const;
export type ZLayer = keyof typeof zLayers;

/** Spacing roles that exist only at the layout level. */
export const layoutSpace = {
  sectionGap: "var(--space-section-gap)",
  blockGap: "var(--space-block-gap)",
  panelPad: "var(--space-panel-pad)",
} as const;
