import type { SVGProps } from "react";

/**
 * THE AMANTRIKA MARK
 *
 * "Amantrika" is the invitation itself, so the mark is the thing you walk
 * through to arrive at one: a torana — the arch hung over a doorway for a
 * wedding — drawn so its two legs and tie-beam also read as an **A**. The dot
 * above it is the marigold strung at the keystone.
 *
 * Two colour slots, never more, because the mark has to survive a 16px favicon:
 *
 *   ink     the arch — `currentColor`, so it takes the text colour it sits in
 *   accent  the tie-beam and the marigold — `--logo-accent`, defaulting to the
 *           active theme's `--color-accent`
 *
 * That is the whole recolouring story. Change `--color-primary` / `--color-accent`
 * (or put the mark inside a `text-…` utility) and the logo follows the site;
 * no second set of brand hexes to keep in sync. The standalone files in
 * `public/brand/` carry the same two variables with hardcoded fallbacks, since
 * an SVG loaded through `<img>` or a favicon slot gets no cascade from the page.
 *
 * Geometry is on a 32×32 grid with a ~5px optical margin, so the mark can be
 * dropped straight into a 32px box without extra padding.
 */

export type BrandProps = SVGProps<SVGSVGElement> & {
  /** Accessible name. Omit for decorative use next to a visible wordmark. */
  title?: string;
};

/* ============================== Mark ============================== */

/**
 * The arch on its own. 24px unless told otherwise — as an *attribute*, not a
 * class, so a `size-*` utility on `className` overrides it cleanly instead of
 * racing another class for specificity.
 */
export function AmantrikaMark({ title, className = "", ...rest }: BrandProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={24}
      height={24}
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      className={className}
      {...rest}
    >
      {title && <title>{title}</title>}

      {/* The arch: two splayed legs meeting in a half-round keystone. Drawn as
          one open path so the stroke joins stay clean at any size. */}
      <path
        d="M5.4 27 L12.4 11.2 A4 4 0 0 1 19.6 11.2 L26.6 27"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Tie-beam — the crossbar of the A. Accent, so the letterform still
          reads when the mark is scaled down past the point where the marigold
          is a single pixel. */}
      <path
        d="M9.8 20.6 H22.2"
        stroke="var(--logo-accent, var(--color-accent))"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* The marigold at the keystone. */}
      <circle cx="16" cy="5.4" r="2.4" fill="var(--logo-accent, var(--color-accent))" />
    </svg>
  );
}

/**
 * The mark inside an arch-topped tile — the avatar / app-icon form, for places
 * that need the logo to hold its own against a photograph or a dense header.
 */
export function AmantrikaBadge({ title, className = "", ...rest }: BrandProps) {
  return (
    <span
      className={`inline-grid place-items-center bg-primary-soft text-primary ${className || "size-10"}`}
      style={{ borderRadius: "var(--radius-arch)" }}
    >
      <AmantrikaMark title={title} className="size-[62%]" {...rest} />
    </span>
  );
}

/* ============================ Wordmark ============================ */

/**
 * "Amantrika" with the swash beneath it. The swash is drawn rather than typed
 * because a font-dependent flourish would change shape on every theme that
 * swaps the display face.
 */
export function AmantrikaWordmark({
  className = "",
  swash = true,
}: {
  className?: string;
  /** The underline flourish. Drop it in tight spaces — a footer column head. */
  swash?: boolean;
}) {
  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span className="font-display text-2xl font-semibold tracking-tight">Amantrika</span>
      {swash && (
        <svg
          aria-hidden
          viewBox="0 0 120 8"
          className="mt-0.5 h-1.5 w-[6.5rem]"
          style={{ color: "var(--logo-accent, var(--color-accent))" }}
        >
          <path
            d="M2 5c20-4 40 3 60-1s40-3 56 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )}
    </span>
  );
}

/* ============================= Lockup ============================= */

/**
 * Mark + wordmark, the default signature. `text-primary` on this element is
 * what colours the arch and the letters; the accent parts opt out of it
 * deliberately so the logo keeps its two tones inside a single-colour block.
 */
export function AmantrikaLogo({
  className = "",
  markOnly = false,
  swash = true,
  title = "Amantrika",
}: {
  className?: string;
  /** Drop the wordmark — for a collapsed mobile header or a square slot. */
  markOnly?: boolean;
  swash?: boolean;
  title?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-primary ${className}`}>
      <AmantrikaMark title={markOnly ? title : undefined} className="size-8 shrink-0" />
      {!markOnly && <AmantrikaWordmark swash={swash} />}
    </span>
  );
}
