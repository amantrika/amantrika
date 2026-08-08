import { randomBytes } from "node:crypto";
import { WATERMARK_NOTICE } from "@/lib/entitlements";

/**
 * The watermark on a free invitation.
 *
 * The threat is not a casual guest — it is the host who opens dev-tools, or
 * pastes a CSS snippet from a forum, to get the paid product for nothing. So
 * the watermark is *structural*: server-rendered elements with content, not a
 * CSS overlay, not a `::after` on body, and never anything a client-side check
 * could switch off (CLAUDE.md §2).
 *
 * Three properties make it stick, and each is asserted in tests/unit:
 *
 *   1. Class names are derived from a nonce generated per request, so a rule
 *      written against today's markup does not match tomorrow's, and a snippet
 *      shared between hosts matches neither.
 *   2. No two marks share a class, a tag or an attribute — so deleting
 *      everything matching any single selector always leaves the rest standing.
 *   3. One mark sits in the normal document flow rather than in a fixed
 *      overlay, so stripping every positioned element still leaves a credit
 *      line in the content.
 *
 * None of this is unbreakable. Someone determined will win against markup they
 * control the rendering of. The goal is to make removal more effort than the
 * upgrade costs.
 */

export type WatermarkPlacement = "overlay" | "inline";

export type WatermarkMark = {
  /** React key. Stable within a render, meaningless across renders. */
  key: string;
  /** The element to render. Varied so no tag selector catches every mark. */
  tag: "div" | "span" | "aside" | "p";
  /** Unique to this mark, in this request. */
  className: string;
  text: string;
  placement: WatermarkPlacement;
  style: Record<string, string | number>;
};

export type WatermarkPlan = {
  nonce: string;
  marks: WatermarkMark[];
};

/** Where the overlay marks sit. Spread out, so cropping a screenshot can't win. */
const OVERLAY_POSITIONS: Array<Record<string, string>> = [
  { top: "12%", left: "6%", transform: "rotate(-24deg)" },
  { top: "44%", right: "8%", transform: "rotate(18deg)" },
  { bottom: "18%", left: "14%", transform: "rotate(-12deg)" },
  { bottom: "6%", right: "10%", transform: "rotate(8deg)" },
];

const TAGS: Array<WatermarkMark["tag"]> = ["div", "span", "aside", "p"];

/** 12 hex characters is plenty to make a hand-written selector useless. */
export function watermarkNonce(): string {
  return randomBytes(6).toString("hex");
}

/**
 * Pure given a nonce, so tests can pin it. Production calls
 * `createWatermarkPlan()` and gets a fresh one per request.
 */
export function buildWatermarkPlan(nonce: string): WatermarkPlan {
  const marks: WatermarkMark[] = OVERLAY_POSITIONS.map((position, index) => ({
    key: `wm-${index}`,
    tag: TAGS[index % TAGS.length],
    // Distinct per mark *and* per request. A leading letter keeps it a valid
    // CSS identifier.
    className: `a${nonce}${index.toString(36)}`,
    text: WATERMARK_NOTICE,
    placement: "overlay" as const,
    style: {
      position: "fixed",
      zIndex: 2147483000 - index,
      // Legible enough to be unwelcome in a screenshot, faint enough that the
      // invitation is still a pleasure to read.
      opacity: 0.22,
      fontSize: "clamp(0.9rem, 3.2vw, 1.6rem)",
      fontWeight: 600,
      letterSpacing: "0.08em",
      whiteSpace: "nowrap",
      // The watermark must never eat a tap meant for the RSVP button.
      pointerEvents: "none",
      userSelect: "none",
      ...position,
    },
  }));

  // The one that is not an overlay. Removing every fixed-position element — the
  // obvious blunt attack — leaves this in the document flow.
  marks.push({
    key: "wm-inline",
    tag: "p",
    className: `a${nonce}z`,
    text: WATERMARK_NOTICE,
    placement: "inline",
    style: {
      textAlign: "center",
      padding: "1.25rem 1rem",
      fontSize: "0.875rem",
      opacity: 0.75,
    },
  });

  return { nonce, marks };
}

export function createWatermarkPlan(): WatermarkPlan {
  return buildWatermarkPlan(watermarkNonce());
}

/**
 * Every selector that would match at least one mark — the input to the test
 * that proves no single one of them matches all.
 */
export function selectorsFor(plan: WatermarkPlan): string[] {
  const classSelectors = plan.marks.map((mark) => `.${mark.className}`);
  const tagSelectors = [...new Set(plan.marks.map((mark) => mark.tag))];
  return [...classSelectors, ...tagSelectors];
}

/** Marks that would survive deleting everything matching `selector`. */
export function survivorsOf(plan: WatermarkPlan, selector: string): WatermarkMark[] {
  const isClass = selector.startsWith(".");
  const value = isClass ? selector.slice(1) : selector;

  return plan.marks.filter((mark) => (isClass ? mark.className !== value : mark.tag !== value));
}
