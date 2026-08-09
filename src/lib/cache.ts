import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";
import { assetUrl } from "@/lib/invites/invite";
import type { AthemeRow, EventType, PlanRow, ThemeRow } from "@/lib/supabase/types";

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
  themes: "themes",
  showcase: "showcase",
  invite: "invite",
  features: "features",
} as const;

/** Per-invitation tag, so editing one does not flush every other invitation. */
export const inviteTag = (slug: string) => `invite:${slug}`;

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

/**
 * The theme catalogue: which themes are offered, in what order, and at which
 * tier. Read by the builder's picker and by the marketing pages that show the
 * range.
 *
 * This is the *catalogue* only. How a theme actually looks and lays itself out
 * is `src/themes/index.ts`, which is typed and tested; a row here decides
 * whether a theme is offered and to whom. Withdrawing one is `is_active =
 * false`, which hides it from the picker and leaves every invitation already
 * using it untouched.
 */
export const getCachedThemes = unstable_cache(
  async (): Promise<ThemeRow[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("themes")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    return (data ?? []) as ThemeRow[];
  },
  ["themes:active"],
  { revalidate: 3600, tags: [CACHE_TAGS.themes] }
);

/**
 * The theme gallery: the five Amantrika designs shown as photographs, on the
 * landing page and at the top of the builder's theme step.
 *
 * Separate from `getCachedThemes` because it answers a different question. That
 * one is "what can be rendered"; this one is "what is on display". A row here
 * points at a row there through `render_theme_id`, which is what makes a
 * gallery card selectable without inventing a theme the guest page cannot draw.
 *
 * Shares the `themes` cache tag: the two are edited together — repointing a
 * card at a different theme, or withdrawing the theme underneath a card, should
 * not leave one of them stale for an hour.
 */
export const getCachedAthemes = unstable_cache(
  async (): Promise<AthemeRow[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("atheme")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    // An empty gallery renders as nothing at all, which is right when there is
    // genuinely nothing to show and indistinguishable from failure when there
    // is. Discarding the error made a missing table, a wrong RLS policy and an
    // empty catalogue look identical — and the table being missing is exactly
    // the state this shipped in. Degrade to no gallery, but say why.
    if (error) {
      console.error("atheme read failed — gallery hidden", {
        code: error.code,
        message: error.message,
      });
      return [];
    }
    return (data ?? []) as AthemeRow[];
  },
  ["atheme:active"],
  { revalidate: 3600, tags: [CACHE_TAGS.themes] }
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


/* ------------------------------------------------------- the guest-facing page */

/**
 * A published invitation, cached per slug.
 *
 * This is the single most-loaded page in the product — every guest of every
 * wedding hits it, most of them on a phone over patchy mobile data — and it was
 * fetching three tables on every single request. The content changes when a host
 * edits, which is rare, so it is exactly the shape caching is for.
 *
 * Tagged per slug rather than globally: editing one invitation must not flush
 * every other couple's. `revalidateTag(inviteTag(slug))` on any write that
 * touches the invitation keeps it correct.
 *
 * Blessings are deliberately *not* cached here — a guest who posts one expects
 * to see it, and a stale guestbook reads as the site having lost their message.
 */
export function getCachedInvite(slug: string) {
  return unstable_cache(
    async () => {
      const { getPublishedInvite } = await import("@/lib/invites/queries");
      return getPublishedInvite(slug);
    },
    ["invite", slug],
    { revalidate: 300, tags: [CACHE_TAGS.invite, inviteTag(slug)] }
  )();
}

/* ---------------------------------------------------------------- roadmap */

/**
 * The feature board and its leaderboard. Both are public and identical for
 * everyone, and were being fetched fresh on every roadmap view — the slowest
 * page on the site at 2s.
 *
 * Thirty seconds, not an hour: someone who has just voted or posted an idea
 * should see it appear. Voting and proposing both `revalidateTag`, so the wait
 * is a ceiling rather than the normal case.
 */
export const getCachedFeatureBoard = unstable_cache(
  async () => {
    const { listFeatureRequests, featureLeaderboard } = await import("@/lib/features/queries");
    const [requests, leaderboard] = await Promise.all([
      listFeatureRequests(),
      featureLeaderboard(),
    ]);
    return { requests, leaderboard };
  },
  ["feature-board"],
  { revalidate: 30, tags: [CACHE_TAGS.features] }
);
