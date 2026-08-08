import { createClient } from "@/lib/supabase/server";
import { PartnersTable, type PartnerRow } from "./PartnersTable";

/**
 * Partner applications. Agents sign up `pending` and cannot attach themselves to
 * an invitation until approved — that is enforced by the events insert policy,
 * not just by hiding UI.
 */
export default async function AdminPartnersPage() {
  const supabase = await createClient();

  const { data: agents } = await supabase
    .from("agents")
    .select("*")
    .order("applied_at", { ascending: false });

  const ids = (agents ?? []).map((a) => a.id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name, email, created_at").in("id", ids)
    : { data: [] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Client counts and earnings per partner, so approval isn't a blind decision.
  const { data: events } = await supabase.from("events").select("agent_id");
  const { data: commissions } = await supabase.from("commissions").select("agent_id, amount_inr");

  const eventCount = new Map<string, number>();
  for (const e of events ?? []) {
    if (e.agent_id) eventCount.set(e.agent_id, (eventCount.get(e.agent_id) ?? 0) + 1);
  }
  const earned = new Map<string, number>();
  for (const c of commissions ?? []) {
    earned.set(c.agent_id, (earned.get(c.agent_id) ?? 0) + c.amount_inr);
  }

  const rows: PartnerRow[] = (agents ?? []).map((a) => ({
    id: a.id,
    name: profileById.get(a.id)?.full_name ?? null,
    email: profileById.get(a.id)?.email ?? null,
    agencyName: a.agency_name,
    referralCode: a.referral_code,
    commissionRate: a.commission_rate,
    status: a.status,
    appliedAt: a.applied_at,
    reviewedAt: a.reviewed_at,
    reviewNote: a.review_note,
    applicationNote: a.application_note,
    invitesManaged: eventCount.get(a.id) ?? 0,
    earnedInr: earned.get(a.id) ?? 0,
  }));

  return <PartnersTable rows={rows} />;
}
