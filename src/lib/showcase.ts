import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toInviteView, type InviteView } from "@/lib/invite";
import type { AssetRow, EventRow, EventType, SubEventRow } from "@/lib/supabase/types";

/**
 * The public gallery reads *clones*, never live invitations.
 *
 * A clone is a separate row with `status = 'archived'`, a `showcase-` slug, and
 * `showcase_source_id` pointing at the original. Archived means the ordinary
 * "public reads published events" policy can't serve it — only the narrower
 * showcase policy can — so a clone is reachable at `/showcase/...` and nowhere
 * else. See project-overview.md §2.12.
 */

export interface ShowcaseItem {
  slug: string;
  title: string;
  eventType: EventType;
  themeId: string;
  city: string | null;
  tags: string[];
  coverUrl: string | null;
  showcasedAt: string | null;
}

export async function listShowcase(eventType?: EventType): Promise<ShowcaseItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("events")
    .select("id, slug, title, event_type, theme_id, city, showcase_tags, showcased_at")
    .eq("is_showcased", true)
    .not("showcase_source_id", "is", null)
    .order("showcased_at", { ascending: false })
    .limit(60);

  if (eventType) query = query.eq("event_type", eventType);

  const { data: rows } = await query;
  if (!rows?.length) return [];

  // One round trip for every cover image rather than one per card.
  const { data: assets } = await supabase
    .from("assets")
    .select("event_id, storage_path, sort_order")
    .in(
      "event_id",
      rows.map((r) => r.id)
    )
    .eq("kind", "photo")
    .order("sort_order");

  const coverByEvent = new Map<string, string>();
  for (const asset of assets ?? []) {
    if (!coverByEvent.has(asset.event_id)) coverByEvent.set(asset.event_id, asset.storage_path);
  }

  const { assetUrl } = await import("@/lib/invite");

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    eventType: row.event_type,
    themeId: row.theme_id,
    city: row.city,
    tags: row.showcase_tags ?? [],
    coverUrl: coverByEvent.has(row.id) ? assetUrl(coverByEvent.get(row.id)!) : null,
    showcasedAt: row.showcased_at,
  }));
}

/** A single showcase clone, rendered with the same components as a real invite. */
export async function getShowcaseInvite(slug: string): Promise<InviteView | null> {
  // Guard the prefix so this route can never be used to read a live invitation
  // whose id someone happens to know.
  if (!slug.startsWith("showcase-")) return null;

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("is_showcased", true)
    .not("showcase_source_id", "is", null)
    .maybeSingle();

  if (!event) return null;

  const [{ data: subEvents }, { data: assets }] = await Promise.all([
    supabase.from("sub_events").select("*").eq("event_id", event.id).order("sort_order"),
    supabase.from("assets").select("*").eq("event_id", event.id).order("sort_order"),
  ]);

  return toInviteView(
    event as EventRow,
    (subEvents ?? []) as SubEventRow[],
    (assets ?? []) as AssetRow[]
  );
}

/** Occasions actually present in the gallery, for the filter row. */
export async function showcaseEventTypes(): Promise<EventType[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("event_type")
    .eq("is_showcased", true)
    .not("showcase_source_id", "is", null);

  return [...new Set((data ?? []).map((r) => r.event_type))];
}
