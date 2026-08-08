import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { UsersTable, type UserRowData } from "./UsersTable";

export default async function AdminUsersPage() {
  const me = await requireRole(["admin"], "/admin/users");
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  const { data: events } = await supabase.from("events").select("owner_id");
  const inviteCount = new Map<string, number>();
  for (const e of events ?? []) {
    inviteCount.set(e.owner_id, (inviteCount.get(e.owner_id) ?? 0) + 1);
  }

  // Who is eligible for admin at all — shown so the UI can explain a refusal
  // before the database has to.
  const { data: allowlist } = await supabase.from("admin_allowlist").select("email");
  const eligible = new Set((allowlist ?? []).map((a) => a.email.toLowerCase()));

  const rows: UserRowData[] = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.full_name,
    email: p.email,
    phone: p.phone,
    role: p.role,
    createdAt: p.created_at,
    referredBy: p.referred_by,
    invites: inviteCount.get(p.id) ?? 0,
    adminEligible: p.email ? eligible.has(p.email.toLowerCase()) : false,
    isSelf: p.id === me.id,
  }));

  return <UsersTable rows={rows} />;
}
