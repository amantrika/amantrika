import { cloudinaryCloud } from "@/lib/env";
import type { AthemeRow } from "@/lib/supabase/types";

/**
 * The theme gallery: the five Amantrika designs, shown as photographs.
 *
 * These are not renderable themes. Each row carries a `render_theme_id` into
 * the real catalogue, and that is what an invitation is actually built with —
 * see the comment on `supabase/migrations/*_atheme_gallery.sql` for why the two
 * are separate tables. Everything in this file exists to keep app code from
 * ever having to know which is which.
 */

/**
 * Builds a delivery URL from a stored path.
 *
 * `f_auto,q_auto` are Cloudinary's format and quality negotiators: they serve
 * AVIF or WebP to browsers that take it and drop the 990KB source PNG to
 * something a phone on 3G can afford. `w_` is passed explicitly rather than
 * left to `next/image` because the transform happens at Cloudinary's edge, so
 * the large original never crosses the wire at all.
 *
 * Returns null when no cloud is configured, which callers render as an absent
 * card rather than a broken image.
 */
export function cloudinaryUrl(imagePath: string, width = 800): string | null {
  if (!cloudinaryCloud) return null;
  // Stored as `/image/upload/v123/static-assets/x.png`; the transform slots in
  // directly after `upload`.
  const withTransform = imagePath.replace(
    "/image/upload/",
    `/image/upload/f_auto,q_auto,w_${width}/`
  );
  return `https://res.cloudinary.com/${cloudinaryCloud}${withTransform}`;
}

/**
 * Where a live preview of a design is served.
 *
 * A constant rather than an environment variable, deliberately. It is a stable
 * first-party domain, and the failure modes are not symmetrical: a wrong
 * constant is visible the first time anyone opens a preview, while a variable
 * missing from a deployment is silent — which is exactly how the gallery
 * shipped with a placeholder on every card when
 * `NEXT_PUBLIC_CLOUDINARY_CLOUD` was absent from Vercel. One fewer thing that
 * has to be right in two places.
 */
const PREVIEW_ORIGIN = "https://invite.amantrika.com";

/**
 * The live preview URL for a design.
 *
 * `identifier` is `atheme.id` — the legacy catalogue's own identifier, kept
 * verbatim in that column precisely so it can be handed back to the legacy
 * preview without a mapping table. Encoded even though every current id is a
 * plain slug, because the ids come from a database row and not from this file.
 */
export function previewSiteUrl(identifier: string): string {
  return `${PREVIEW_ORIGIN}/preview?theme=${encodeURIComponent(identifier)}`;
}

/** A gallery card, resolved for rendering. */
export interface AthemeCard {
  id: string;
  name: string;
  /** Null when Cloudinary is not configured for this deployment. */
  imageUrl: string | null;
  /** Full-resolution variant — the fallback if the live preview cannot load. */
  previewUrl: string | null;
  /**
   * The live, interactive invitation shown inside the phone frame. Resolved
   * here with the image URLs so no component ever assembles one itself.
   */
  previewHref: string;
  /** The `themes(id)` an invitation gets when this card is chosen. */
  renderThemeId: string;
  /**
   * Whether the theme this card builds needs a paid plan. Read from the themes
   * catalogue, never from a list of ids in app code — three of the five map to
   * premium themes and a host should learn that here, not at checkout.
   */
  isPremium: boolean;
}

/**
 * Joins gallery rows to the tiers in the themes catalogue.
 *
 * Takes the tier map rather than querying, so the caller can reuse the themes
 * read it has already made — both the landing page and the builder need both
 * lists anyway.
 */
export function toAthemeCards(
  rows: AthemeRow[],
  premiumThemeIds: ReadonlySet<string>
): AthemeCard[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    imageUrl: cloudinaryUrl(row.image_path, 800),
    previewUrl: cloudinaryUrl(row.image_path, 1600),
    previewHref: previewSiteUrl(row.id),
    renderThemeId: row.render_theme_id,
    isPremium: premiumThemeIds.has(row.render_theme_id),
  }));
}
