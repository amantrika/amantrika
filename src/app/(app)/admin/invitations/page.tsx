import { createClient } from "@/lib/supabase/server";
import { InvitationsTable, type InvitationRow } from "./InvitationsTable";

/** Every real invitation. Showcase clones are excluded — they're managed under Showcase. */
export default async function AdminInvitationsPage() {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .is("showcase_source_id", null)
    .order("created_at", { ascending: false })
    .limit(300);

  const ownerIds = [...new Set((events ?? []).map((e) => e.owner_id))];
  const { data: owners } = ownerIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", ownerIds)
    : { data: [] };
  const ownerById = new Map((owners ?? []).map((o) => [o.id, o]));

  const rows: InvitationRow[] = (events ?? []).map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    eventType: e.event_type,
    status: e.status,
    themeId: e.theme_id,
    city: e.city,
    mainDate: e.main_datetime,
    createdAt: e.created_at,
    publishedAt: e.published_at,
    ownerName: ownerById.get(e.owner_id)?.full_name ?? null,
    ownerEmail: ownerById.get(e.owner_id)?.email ?? null,
    viaAgent: Boolean(e.agent_id),
    consented: e.permissions?.showcase_consent === true,
    isShowcased: e.is_showcased,
  }));

  return <InvitationsTable rows={rows} />;
}
