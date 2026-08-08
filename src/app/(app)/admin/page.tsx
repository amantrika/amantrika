import Link from "next/link";
import { Button, Card, Stat } from "@/design-system/components";
import { TrendChart } from "./Charts";
import { AdminSection } from "./AdminShell";
import { createClient } from "@/lib/supabase/server";
import { Table } from "@/design-system/components";
import type { AdminDailyPoint, AdminOverview } from "@/lib/supabase/types";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [{ data: overview }, { data: series }] = await Promise.all([
    supabase.rpc("admin_overview"),
    supabase.rpc("admin_daily_series", { p_days: 30 }),
  ]);

  const { data: badge } = await supabase.rpc("admin_badge_stats", { p_days: 30 });
  const badgeStats = (badge ?? {}) as {
    total?: number;
    window?: number;
    uniques?: number;
    top?: { slug: string; title: string; clicks: number; uniques: number }[];
  };

  const stats = (overview as AdminOverview) ?? null;
  const daily = (series as AdminDailyPoint[]) ?? [];

  if (!stats) {
    return (
      <Card className="p-10 text-center">
        <p className="type-body text-muted">Couldn&apos;t load platform metrics.</p>
      </Card>
    );
  }

  return (
    <div>
      {/* Things needing a decision come first — a dashboard should surface work,
          not just numbers. */}
      {(stats.agents_pending > 0 || stats.showcase_eligible > 0) && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {stats.agents_pending > 0 && (
            <Card variant="ornate" className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="type-overline">Needs review</p>
                <p className="mt-1 type-body">
                  <strong>{stats.agents_pending}</strong> partner application
                  {stats.agents_pending === 1 ? "" : "s"} waiting
                </p>
              </div>
              <Link href="/admin/partners">
                <Button size="sm">Review</Button>
              </Link>
            </Card>
          )}
          {stats.showcase_eligible > 0 && (
            <Card variant="ornate" className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="type-overline">Ready to curate</p>
                <p className="mt-1 type-body">
                  <strong>{stats.showcase_eligible}</strong> consenting invitation
                  {stats.showcase_eligible === 1 ? "" : "s"}
                </p>
              </div>
              <Link href="/admin/showcase">
                <Button size="sm" variant="secondary">
                  Curate
                </Button>
              </Link>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue (all time)" value={inr(stats.revenue_inr)} />
        <Stat label="Revenue (30 days)" value={inr(stats.revenue_30d_inr)} />
        <Stat label="Commission owed" value={inr(stats.commission_owed_inr)} />
        <Stat label="Paid orders" value={stats.orders_paid} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Accounts" value={stats.profiles_total} />
        <Stat label="Invitations" value={stats.events_total} />
        <Stat label="Published" value={stats.events_published} />
        <Stat label="Invite views" value={compact(stats.views_total)} />
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {/* Revenue and activity are separate charts on separate scales.
            Never a dual axis: two y-scales make any crossing point meaningless. */}
        <TrendChart
          title="Revenue · last 30 days"
          caption={`${inr(stats.revenue_30d_inr)} in the last 30 days`}
          data={daily}
          series={[{ key: "revenue_inr", label: "Revenue" }]}
          format="inrCompact"
        />

        <TrendChart
          title="Signups & new invitations · last 30 days"
          caption={`${stats.profiles_7d} new accounts and ${stats.events_7d} new invitations in the last 7 days`}
          data={daily}
          series={[
            { key: "signups", label: "Signups" },
            { key: "invites", label: "Invitations" },
          ]}
        />

        <TrendChart
          title="Invite views · last 30 days"
          caption="Every guest opening any published invitation"
          data={daily}
          series={[{ key: "views", label: "Views" }]}
          format="compact"
        />
      </div>

      <AdminSection
        title="Made with Amantrika"
        description="Guests who tapped the badge on a free invitation and came back to the site — the product's only organic acquisition loop."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Clicks (all time)" value={badgeStats.total ?? 0} />
          <Stat label="Clicks (30 days)" value={badgeStats.window ?? 0} />
          <Stat label="Unique people (30 days)" value={badgeStats.uniques ?? 0} />
        </div>

        {(badgeStats.top?.length ?? 0) > 0 && (
          <div className="mt-4">
            <Table headers={["Invitation", "Link", "Clicks", "Unique people"]}>
              {badgeStats.top!.map((row) => (
                <tr key={row.slug}>
                  <td className="px-4 py-3 font-semibold">{row.title}</td>
                  <td className="px-4 py-3 font-mono type-caption">/invite/{row.slug}</td>
                  <td className="px-4 py-3">{row.clicks}</td>
                  <td className="px-4 py-3">{row.uniques}</td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </AdminSection>

      <AdminSection title="At a glance" description="The rest of the platform in numbers.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Hosts" value={stats.hosts} />
          <Stat label="Partners" value={stats.agents_total} />
          <Stat label="Drafts in progress" value={stats.events_draft} />
          <Stat label="Showcase live" value={stats.showcase_live} />
          <Stat label="Guests invited" value={stats.guests_total} />
          <Stat label="RSVPs received" value={stats.rsvps_total} />
          <Stat label="New accounts (7d)" value={stats.profiles_7d} />
          <Stat label="New invitations (7d)" value={stats.events_7d} />
        </div>
      </AdminSection>
    </div>
  );
}
