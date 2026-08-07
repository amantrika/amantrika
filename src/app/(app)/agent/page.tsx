import type { Metadata } from "next";
import Link from "next/link";
import { DashboardShell, NewInviteButton } from "../DashboardShell";
import { ReferralCard } from "./ReferralCard";
import { requireRole } from "@/lib/auth";
import { getAgentStats, listManagedEvents } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
import { eventTypeLabels } from "@/lib/invite";
import { Badge, Button, Card, Stat, Table } from "@/design-system/components";
import type { Agent, CommissionRow, Profile } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Clients & earnings · Amantrika",
  robots: { index: false },
};

const inr = (paise: number) => `₹${paise.toLocaleString("en-IN")}`;

export default async function AgentPage() {
  const profile = await requireRole(["agent", "admin"], "/agent");
  const supabase = await createClient();

  const [stats, events, agentResult, clientsResult, commissionsResult] = await Promise.all([
    getAgentStats(profile.id),
    listManagedEvents(),
    supabase.from("agents").select("*").eq("id", profile.id).maybeSingle(),
    supabase.from("profiles").select("*").eq("referred_by", profile.id),
    supabase
      .from("commissions")
      .select("*")
      .eq("agent_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const agent = agentResult.data as Agent | null;
  const clients = (clientsResult.data ?? []) as Profile[];
  const commissions = (commissionsResult.data ?? []) as CommissionRow[];
  const managed = events.filter((e) => e.agent_id === profile.id);

  return (
    <DashboardShell
      profile={profile}
      title="Clients & earnings"
      subtitle={agent?.agency_name ?? "Your partner account"}
      action={<NewInviteButton />}
    >
      <div className="flex flex-col gap-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Invitations built" value={stats.events_total} />
          <Stat label="Published" value={stats.events_published} />
          <Stat label="Total earned" value={inr(stats.earned_inr)} />
          <Stat label="Awaiting payout" value={inr(stats.unpaid_inr)} />
        </div>

        {agent && (
          <ReferralCard
            referralCode={agent.referral_code}
            commissionRate={agent.commission_rate}
            signupUrl={`${siteUrl}/signup?as=host&ref=${agent.referral_code}`}
          />
        )}

        <section>
          <h2 className="mb-3 type-h2 text-primary">Invitations you manage</h2>
          {managed.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="type-body text-muted">
                You haven&apos;t built any invitations yet. Start one for a client and your
                commission accrues the moment they pay.
              </p>
              <Link href="/onboarding" className="mt-5 inline-block">
                <Button variant="celebration">Build an invitation</Button>
              </Link>
            </Card>
          ) : (
            <Table headers={["Invitation", "Occasion", "Status", "Link", ""]}>
              {managed.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-3 font-semibold">{event.title}</td>
                  <td className="px-4 py-3">{eventTypeLabels[event.event_type]}</td>
                  <td className="px-4 py-3">
                    <Badge tone={event.status === "published" ? "success" : "accent"}>
                      {event.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono type-caption">/invite/{event.slug}</td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/${event.id}`}>
                      <Button size="sm" variant="ghost">Manage</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </section>

        <section>
          <h2 className="mb-3 type-h2 text-primary">Clients you referred</h2>
          {clients.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="type-caption italic">
                Share your referral link — anyone signing up through it is credited to you.
              </p>
            </Card>
          ) : (
            <Table headers={["Name", "Email", "Joined"]}>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td className="px-4 py-3 font-semibold">{client.full_name ?? "—"}</td>
                  <td className="px-4 py-3 type-caption">{client.email}</td>
                  <td className="px-4 py-3 type-caption">
                    {new Date(client.created_at).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </section>

        <section>
          <h2 className="mb-3 type-h2 text-primary">Commission ledger</h2>
          {commissions.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="type-caption italic">
                No commissions yet. They accrue automatically when a client pays.
              </p>
            </Card>
          ) : (
            <Table headers={["Date", "Rate", "Amount", "Status"]}>
              {commissions.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 type-caption">
                    {new Date(c.created_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3">{(c.rate * 100).toFixed(1)}%</td>
                  <td className="px-4 py-3 font-semibold">{inr(c.amount_inr)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={c.status === "paid" ? "success" : "accent"}>{c.status}</Badge>
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
