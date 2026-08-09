import "server-only";
import type { DataProvider } from "@/lib/data/provider";
import { createPublicClient } from "@/lib/supabase/server";
import { toInviteView, type InviteView } from "@/lib/invites/invite";
import { demoInvite, isDemoSlug } from "@/lib/invites/demo";
import type { AssetRow, EventRow, SubEventRow } from "@/lib/supabase/types";

/**
 * The incumbent. This is the behaviour that has been in production — moved
 * here unchanged so that switching providers compares like with like.
 *
 * Nothing new should be added to this class. It exists to be deleted once the
 * AWS side is complete and proven.
 */
export class SupabaseDataProvider implements DataProvider {
  readonly name = "supabase" as const;

  async getPublishedInvite(slug: string): Promise<InviteView | null> {
    // Session-less on purpose: this runs inside `getCachedInvite`'s
    // `unstable_cache`, and Next throws if a cached function touches
    // `cookies()`. The read is identical for every guest and only ever returns
    // published rows, so the anon grant is the correct one anyway.
    const supabase = createPublicClient();

    const { data: event } = await supabase
      .from("events")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (!event) return isDemoSlug(slug) ? demoInvite(slug) : null;

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

}
