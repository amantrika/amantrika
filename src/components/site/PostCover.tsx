import { motifs } from "@/design-system/motifs";

/**
 * A post's cover — the photograph if it has one, a drawn title card if it does
 * not.
 *
 * Most posts have no cover image, and the card grid handled that by simply
 * omitting the image: the post with a photograph towered over the ones without,
 * and a row of three teasers came out ragged. Worse, the post page opened with
 * a headline against nothing at all.
 *
 * So the fallback sets the title *as* the artwork — framed, on the theme's
 * paper, between two motifs. It occupies the same box the photograph would, so
 * a mixed grid lines up, and it reads as a deliberate title card rather than a
 * gap where an image failed to load.
 *
 * The title is duplicated in the card's own <h3> below it, so this block is
 * `aria-hidden`: a screen reader should hear the headline once, and a title
 * card is decoration, not content.
 */
export function PostCover({
  title,
  category,
  coverImage,
  coverAlt,
  className = "",
  /** Above-the-fold covers should not be lazy — the featured card, the post page. */
  eager = false,
}: {
  title: string;
  category?: string;
  coverImage?: string;
  coverAlt?: string;
  className?: string;
  eager?: boolean;
}) {
  if (coverImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverImage}
        alt={coverAlt ?? ""}
        loading={eager ? "eager" : "lazy"}
        className={`object-cover ${className}`}
      />
    );
  }

  const Corner = motifs["mehndi-corner"];
  const Divider = motifs.paisley;

  return (
    <div
      aria-hidden
      className={`paper-texture relative flex flex-col items-center justify-center overflow-hidden px-6 py-8 text-center ${className}`}
      style={{ backgroundImage: "var(--gradient-blush)" }}
    >
      {/* Inset past the card's own corner radius — at 8px the motif's outer
          arm was being clipped by the rounded edge. */}
      <Corner className="pointer-events-none absolute left-3 top-3 size-7 text-ornate/50" />
      <Corner className="pointer-events-none absolute right-3 top-3 size-7 -scale-x-100 text-ornate/50" />
      <Corner className="pointer-events-none absolute bottom-3 left-3 size-7 -scale-y-100 text-ornate/50" />
      <Corner className="pointer-events-none absolute bottom-3 right-3 size-7 -scale-100 text-ornate/50" />

      {category && <p className="type-overline">{category}</p>}

      <p className="mt-2 line-clamp-4 max-w-md type-h2 text-primary">{title}</p>

      <Divider className="mt-3 h-4 w-16 shrink-0 text-accent/70" />
    </div>
  );
}
