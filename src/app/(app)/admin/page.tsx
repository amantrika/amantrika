import type { Metadata } from "next";
import Link from "next/link";
import { DashboardShell } from "../DashboardShell";
import { requireRole, roleLabels } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { eventTypeLabels } from "@/lib/invite";
import { Badge, Button, Card, Stat, Table } from "@/design-system/components";
import type { CommissionRow, EventRow, OrderRow, Profile } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Platform · Amantrika",
  robots: { index: false },
};

const inr = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/**
 * Platform-wide view. Every query below runs as the signed-in admin — the
 * "admins ..." RLS policies are what widen the result set, not a service key.
 */
export default async function AdminPage() {
  const profile = await requireRole(["admin"], "/admin");
  const supabase = await createClient();

  const [profilesResult, eventsResult, ordersResult, commissionsResult] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("events").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("commissions").select("*").order("created_at", { ascending: false }).limit(100),
  ]);

  const profiles = (profilesResult.data ?? []) as Profile[];
  const events = (eventsResult.data ?? []) as EventRow[];
  const orders = (ordersResult.data ?? []) as OrderRow[];
  const commissions = (commissionsResult.data ?? []) as CommissionRow[];

  const paidOrders = orders.filter((o) => o.status === "paid");
  const revenue = paidOrders.reduce((sum, o) => sum + o.amount_inr, 0);
  const owed = commissions
    .filter((c) => c.status === "accrued" || c.status === "payable")
    .reduce((sum, c) => sum + c.amount_inr, 0);

  return (
    <DashboardShell
      profile={profile}
      title="Platform"
      subtitle="Everything happening across Amantrika."
    >
      <div className="flex flex-col gap-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Accounts" value={profiles.length} />
          <Stat label="Invitations" value={events.length} />
          <Stat label="Gross revenue" value={inr(revenue)} />
          <Stat label="Commission owed" value={inr(owed)} />
        </div>

        <section>
          <h2 className="mb-3 type-h2 text-primary">Invitations</h2>
          {events.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="type-caption italic">No invitations created yet.</p>
            </Card>
          ) : (
            <Table headers={["Title", "Occasion", "Status", "Link", "Created", ""]}>
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-3 font-semibold">{event.title}</td>
                  <td className="px-4 py-3">{eventTypeLabels[event.event_type]}</td>
                  <td className="px-4 py-3">
                    <Badge tone={event.status === "published" ? "success" : "accent"}>
                      {event.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono type-caption">/invite/{event.slug}</td>
                  <td className="px-4 py-3 type-caption">
                    {new Date(event.created_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/${event.id}`}>
                      <Button size="sm" variant="ghost">Open</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </section>

        <section>
          <h2 className="mb-3 type-h2 text-primary">Accounts</h2>
          <Table headers={["Name", "Email", "Role", "Joined"]}>
            {profiles.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-semibold">{p.full_name ?? "—"}</td>
                <td className="px-4 py-3 type-caption">{p.email}</td>
                <td className="px-4 py-3">
                  <Badge tone={p.role === "admin" ? "primary" : p.role === "agent" ? "accent" : "neutral"}>
                    {roleLabels[p.role]}
                  </Badge>
                </td>
                <td className="px-4 py-3 type-caption">
                  {new Date(p.created_at).toLocaleDateString("en-IN")}
                </td>
              </tr>
            ))}
          </Table>
        </section>

        <section>
          <h2 className="mb-3 type-h2 text-primary">Orders</h2>
          {orders.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="type-caption italic">No orders yet.</p>
            </Card>
          ) : (
            <Table headers={["Date", "Plan", "Amount", "Provider", "Status"]}>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 type-caption">
                    {new Date(o.created_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 font-semibold">{o.plan_code}</td>
                  <td className="px-4 py-3">{inr(o.amount_inr)}</td>
                  <td className="px-4 py-3 type-caption">{o.provider}</td>
                  <td className="px-4 py-3">
                    <Badge tone={o.status === "paid" ? "success" : o.status === "failed" ? "error" : "accent"}>
                      {o.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
