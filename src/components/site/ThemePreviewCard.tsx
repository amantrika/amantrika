import Link from "next/link";
import { motifs } from "@/design-system/motifs";
import type { Theme } from "@/themes";

/**
 * A theme, shown as the thing it makes.
 *
 * The old card was four colour bars and a name. Colour is the least of what a
 * theme decides — it also picks the heading face, the greeting script, the
 * corner motif, the border weight, the corner radius and the paper — and a
 * palette strip tells a couple none of that. Two themes with similar palettes
 * looked identical and made the choice feel cosmetic when it is the single
 * biggest decision in the builder.
 *
 * So the card renders a miniature invitation instead. The `data-theme`
 * attribute is the whole mechanism: every token in globals.css rescopes to this
 * subtree, so the preview is not an approximation of the theme, it *is* the
 * theme at a smaller size. Add a theme to the registry and its card is correct
 * without anyone drawing anything.
 *
 * A server component, deliberately — this appears twelve times on the landing
 * page and once per showcase item, and none of it needs to be interactive.
 * That rules out `PatternBackground`, which needs `useId`; the motif corners
 * and the divider are plain inline SVG and carry the same signal.
 */

/** A stand-in couple. Obviously not real, and short enough to fit one line. */
const SAMPLE = { names: "Aarav & Meera", date: "12 · 12 · 2026" };

export function ThemePreviewCard({
  theme,
  href,
  /** Shown under the preview. Off for a dense grid that labels itself elsewhere. */
  showCaption = true,
}: {
  theme: Theme;
  href: string;
  showCaption?: boolean;
}) {
  const Divider = motifs[theme.motifSet.divider];
  const Corner = motifs[theme.motifSet.corner];

  return (
    <Link
      href={href}
      // The theme scope wraps the link, not just the artwork, so the caption
      // picks up the theme's accent too and the whole card reads as one object.
      data-theme={theme.id}
      className="group block overflow-hidden rounded-card border border-ornate/40 shadow-resting transition-shadow focus-visible:shadow-gold-glow hover:shadow-lifted"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="relative aspect-[4/5] p-3">
        <div
          className={`dhaga-frame relative flex size-full flex-col items-center justify-center overflow-hidden px-4 text-center ${theme.texture}`}
        >
          {/* Corner motifs are the theme's own, mirrored into all four corners
              the same way the Card `ornate` variant does it. */}
          <Corner aria-hidden className="pointer-events-none absolute left-1 top-1 size-6 text-ornate/70" />
          <Corner aria-hidden className="pointer-events-none absolute right-1 top-1 size-6 -scale-x-100 text-ornate/70" />
          <Corner aria-hidden className="pointer-events-none absolute bottom-1 left-1 size-6 -scale-y-100 text-ornate/70" />
          <Corner aria-hidden className="pointer-events-none absolute bottom-1 right-1 size-6 -scale-100 text-ornate/70" />

          {/* The greeting is the theme's own line, in the theme's own script —
              which is the fastest way to see that Nikah Emerald and Anand Karaj
              are not the same card in different colours. */}
          <p className="type-greeting text-[0.7rem] leading-tight text-accent">
            {theme.greetingCopy}
          </p>

          {/* Two of these fit across a 320px phone, so the names have to come
              down a step there or a long theme name breaks the card. */}
          <p
            className="mt-2 text-[1.05rem] leading-tight text-primary sm:text-[1.3rem]"
            style={{
              fontFamily: "var(--font-heading), serif",
              fontWeight: "var(--weight-display)",
              letterSpacing: "var(--tracking-display)",
            }}
          >
            {SAMPLE.names}
          </p>

          <Divider aria-hidden className="mt-2 h-4 w-14 text-accent" />

          <p className="type-overline mt-2 text-[0.55rem]">{SAMPLE.date}</p>
        </div>
      </div>

      {showCaption && (
        <div
          className="flex items-center justify-between gap-2 border-t border-ornate/30 px-4 py-3"
          style={{ background: "var(--color-surface)" }}
        >
          <div className="min-w-0">
            <p className="truncate type-body font-semibold text-primary">{theme.name}</p>
            <p className="truncate type-caption capitalize">
              {theme.religionTag} · {theme.moodTag}
            </p>
          </div>
          {/* The palette has not gone away — it is just no longer the headline. */}
          <span aria-hidden className="flex shrink-0 gap-1">
            {theme.palette.map((hex) => (
              <span
                key={hex}
                className="size-2.5 rounded-full ring-1 ring-inset ring-black/10"
                style={{ background: hex }}
              />
            ))}
          </span>
        </div>
      )}
    </Link>
  );
}
