import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";
import { assetUrl } from "@/lib/invites/invite";
import type { EventType, PlanRow } from "@/lib/supabase/types";

/**
 * Cached reads for data that is public and changes rarely.
 *
 * Everything here was previously fetched on every single request, which is what
 * made the marketing pages slow: the database round trip sat on the critical
 * path before anything could render. These are all *public* reads — no row here
 * depends on who is asking — so they are safe to share across visitors.
 *
 * Anything scoped to a signed-in person (dashboards, guest lists, RSVPs) is
 * deliberately absent: caching a per-user read behind a shared key is how one
 * account ends up seeing another's data.
 *
 * Tags let a write invalidate precisely rather than waiting out the TTL —
 * publishing an invitation calls `revalidateTag(CACHE_TAGS.showcase)` and the
 * gallery is correct on the next request.
 */

export const CACHE_TAGS = {
  plans: "plans",
  showcase: "showcase",
  invite: "invite",
} as const;

/** Pricing: read on the landing page and in checkout, edited a few times a year. */
export const getCachedPlans = unstable_cache(
  async (): Promise<PlanRow[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    return (data ?? []) as PlanRow[];
  },
  ["plans:active"],
  { revalidate: 3600, tags: [CACHE_TAGS.plans] }
);

export interface ShowcaseCard {
  slug: string;
  title: string;
  eventType: EventType;
  themeId: string;
  city: string | null;
  tags: string[];
  coverUrl: string | null;
  showcasedAt: string | null;
}

/**
 * The gallery, cover images included.
 *
 * The covers used to be a second query issued after the first resolved. They
 * are folded into one embedded select here, so the page makes a single round
 * trip instead of two sequential ones.
 */
export const getCachedShowcase = unstable_cache(
  async (eventType?: EventType): Promise<ShowcaseCard[]> => {
    const supabase = createPublicClient();

    let query = supabase
      .from("events")
      .select(
        // `assets!assets_event_id_fkey` is required, not stylistic: events and assets
        // are joined by two foreign keys (assets.event_id, and events.cover_asset_id
        // pointing back), so an unqualified embed is ambiguous and PostgREST
        // rejects the whole query with PGRST201 — which reads as an empty gallery.
        "id, slug, title, event_type, theme_id, city, showcase_tags, showcased_at, assets!assets_event_id_fkey(storage_path, sort_order, kind)"
      )
      .eq("is_showcased", true)
      .not("showcase_source_id", "is", null)
      .order("showcased_at", { ascending: false })
      .limit(60);

    if (eventType) query = query.eq("event_type", eventType);

    const { data } = await query;

    return (data ?? []).map((row) => {
      const photos = ((row.assets ?? []) as { storage_path: string; sort_order: number; kind: string }[])
        .filter((a) => a.kind === "photo")
        .sort((a, b) => a.sort_order - b.sort_order);

      return {
        slug: row.slug,
        title: row.title,
        eventType: row.event_type,
        themeId: row.theme_id,
        city: row.city,
        tags: row.showcase_tags ?? [],
        coverUrl: photos[0] ? assetUrl(photos[0].storage_path) : null,
        showcasedAt: row.showcased_at,
      };
    });
  },
  ["showcase:list"],
  { revalidate: 1800, tags: [CACHE_TAGS.showcase] }
);

/** Occasions present in the gallery, for the filter row. */
export const getCachedShowcaseTypes = unstable_cache(
  async (): Promise<EventType[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("events")
      .select("event_type")
      .eq("is_showcased", true)
      .not("showcase_source_id", "is", null);
    return [...new Set((data ?? []).map((r) => r.event_type))];
  },
  ["showcase:types"],
  { revalidate: 1800, tags: [CACHE_TAGS.showcase] }
);
