import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getDataProvider } from "@/lib/data";
import type { InviteView } from "@/lib/invites/invite";
import { demoInvite, isDemoSlug } from "@/lib/invites/demo";
import type {
  AgentStats,
  AssetRow,
  BlessingRow,
  EventRow,
  EventStats,
  GuestRow,
  RsvpRow,
  SubEventRow,
  ViewsByDay,
} from "@/lib/supabase/types";

/**
 * A published invite by slug, or null if it doesn't exist / isn't published.
 *
 * **This is the switch point for the AWS migration.** The read itself now lives
 * behind `getDataProvider()`, so `DATA_PROVIDER=aws` moves this whole route to
 * DynamoDB without any caller — the page, `generateMetadata`, the cache —
 * knowing anything changed.
 *
 * The demo fallback stays here rather than inside either provider: the bundled
 * showcase invitations are not data, they are fixtures, and they must keep the
 * marketing links working on both backends and on an empty database.
 */
export async function getPublishedInvite(slug: string): Promise<InviteView | null> {
  const found = await getDataProvider().getPublishedInvite(slug);
  if (found) return found;
  return isDemoSlug(slug) ? demoInvite(slug) : null;
}

export async function getBlessings(eventId: string): Promise<BlessingRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blessings")
    .select("*")
    .eq("event_id", eventId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(60);
  return (data ?? []) as BlessingRow[];
}

/** Events the caller can manage — RLS already restricts this to owner/agent/admin. */
export async function listManagedEvents(): Promise<EventRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .order("updated_at", { ascending: false });
  return (data ?? []) as EventRow[];
}

export async function getManagedEvent(id: string): Promise<EventRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  return (data as EventRow) ?? null;
}

export async function getSubEvents(eventId: string): Promise<SubEventRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sub_events")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");
  return (data ?? []) as SubEventRow[];
}

export async function getAssets(eventId: string): Promise<AssetRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assets")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");
  return (data ?? []) as AssetRow[];
}

export async function getGuests(eventId: string): Promise<GuestRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("guests")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at");
  return (data ?? []) as GuestRow[];
}

export async function getRsvps(eventId: string): Promise<RsvpRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rsvps")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  return (data ?? []) as RsvpRow[];
}

const emptyStats: EventStats = {
  total_views: 0,
  unique_viewers: 0,
  views_7d: 0,
  guests: 0,
  rsvp_yes: 0,
  rsvp_no: 0,
  rsvp_maybe: 0,
  blessings: 0,
  badge_clicks: 0,
};

export async function getEventStats(eventId: string): Promise<EventStats> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("event_stats", { p_event_id: eventId });
  return (data as EventStats) ?? emptyStats;
}

export async function getViewsByDay(eventId: string, days = 14): Promise<ViewsByDay[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("event_views_by_day", {
    p_event_id: eventId,
    p_days: days,
  });
  return (data as ViewsByDay[]) ?? [];
}

const emptyAgentStats: AgentStats = {
  events_total: 0,
  events_published: 0,
  orders_paid: 0,
  gross_inr: 0,
  earned_inr: 0,
  unpaid_inr: 0,
};

export async function getAgentStats(agentId: string): Promise<AgentStats> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("agent_stats", { p_agent_id: agentId });
  return (data as AgentStats) ?? emptyAgentStats;
}
