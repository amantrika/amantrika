import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getDataProvider } from "@/lib/data";
import { authProviderName } from "@/lib/auth/provider";
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

/**
 * Events the caller can manage.
 *
 * ## Read this before removing the `userId` argument
 *
 * Under Supabase this function deliberately has no `where` clause: RLS
 * restricts it to owner/agent/admin inside the database, and adding an explicit
 * owner filter here would break the agent and admin views, which are supposed
 * to see more than their own rows.
 *
 * That is safe *only while a Supabase session exists*. With `AUTH_PROVIDER=cognito`
 * there is none, so the anonymous grant applies instead — and the anon policy
 * permits reading published events. The result was a dashboard that showed
 * every host's invitations to any signed-in user. It was caught in a browser
 * test, not by a type error, because nothing about the code looks wrong: the
 * filtering was never in the code.
 *
 * So on the Cognito path the query is owner-scoped explicitly, in the
 * repository, where authorization now lives.
 */
export async function listManagedEvents(userId?: string): Promise<EventRow[]> {
  if (authProviderName() === "cognito") {
    // No user means no rows. Failing closed matters more here than convenience:
    // the alternative was returning everyone's invitations.
    if (!userId) return [];
    const { listInvitesForOwner } = await import("@/lib/aws/repo/invites");
    const items = await listInvitesForOwner(userId);
    return items.map(inviteItemToEventRow);
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .order("updated_at", { ascending: false });
  return (data ?? []) as EventRow[];
}

/**
 * DynamoDB item → the Postgres row shape the dashboard components still expect.
 *
 * Temporary by design: it exists so the surfaces can move before their view
 * models do. It should be deleted when the dashboard is ported properly.
 */
function inviteItemToEventRow(item: {
  id: string;
  ownerId: string;
  agentId?: string;
  slug: string;
  status: string;
  title: string;
  eventType: string;
  themeId: string;
  city?: string;
  timezone: string;
  mainDateTime?: string;
  hashtag?: string;
  story?: string;
  coverAssetId?: string;
  hosts: unknown;
  hotels: unknown;
  storyMoments: unknown;
  settings: unknown;
  permissions: unknown;
  planCode: string;
  publishedAt?: string;
  isShowcased: boolean;
  showcaseTags: string[];
  showcasedAt?: string;
  showcaseSourceId?: string;
  createdAt: string;
  updatedAt: string;
}): EventRow {
  return {
    id: item.id,
    owner_id: item.ownerId,
    agent_id: item.agentId ?? null,
    slug: item.slug,
    status: item.status,
    title: item.title,
    event_type: item.eventType,
    theme_id: item.themeId,
    city: item.city ?? null,
    timezone: item.timezone,
    main_datetime: item.mainDateTime ?? null,
    hashtag: item.hashtag ?? null,
    story: item.story ?? null,
    cover_asset_id: item.coverAssetId ?? null,
    hosts: item.hosts,
    hotels: item.hotels,
    story_moments: item.storyMoments,
    settings: item.settings,
    permissions: item.permissions,
    plan_code: item.planCode,
    published_at: item.publishedAt ?? null,
    is_showcased: item.isShowcased,
    showcase_tags: item.showcaseTags,
    showcased_at: item.showcasedAt ?? null,
    showcase_source_id: item.showcaseSourceId ?? null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  } as EventRow;
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
