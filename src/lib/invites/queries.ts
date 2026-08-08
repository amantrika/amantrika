import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toInviteView, type InviteView } from "@/lib/invites/invite";
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
 * Falls back to the bundled showcase invites so the marketing links keep working
 * on a fresh database.
 */
export async function getPublishedInvite(slug: string): Promise<InviteView | null> {
  const supabase = await createClient();

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

  return toInviteView(event as EventRow, (subEvents ?? []) as SubEventRow[], (assets ?? []) as AssetRow[]);
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
