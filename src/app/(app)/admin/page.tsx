import Link from "next/link";
import { Button, Card, Stat, Table } from "@/design-system/components";
import { BreakdownBars, TrendChart, type BreakdownRow } from "./Charts";
import { AdminSection } from "./AdminShell";
import { RangeFilter } from "./RangeFilter";
import { parseRange } from "./range";
import { TrendStat } from "./TrendStat";
import { createClient } from "@/lib/supabase/server";
import type { AdminDailyPoint, AdminOverview } from "@/lib/supabase/types";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

interface WindowTotals {
  signups: number;
  invites: number;
  published: number;
  revenue_inr: number;
  orders: number;
  views: number;
  rsvps: number;
  badge_clicks: number;
}

interface Analytics {
  days: number;
  current: WindowTotals;
  previous: WindowTotals;
  by_occasion: BreakdownRow[];
  by_status: BreakdownRow[];
  by_theme: BreakdownRow[];
  by_plan: BreakdownRow[];
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const days = parseRange((await searchParams).days);
  const supabase = await createClient();

  // One round trip each, issued together: the windowed figures, the daily series
  // for that same window, all-time totals, and badge performance.
  const [{ data: analyticsRaw }, { data: series }, { data: overviewRaw }, { data: badgeRaw }] =
    await Promise.all([
      supabase.rpc("admin_analytics", { p_days: days }),
      supabase.rpc("admin_daily_series", { p_days: days }),
      supabase.rpc("admin_overview"),
      supabase.rpc("admin_badge_stats", { p_days: days }),
    ]);

  const a = analyticsRaw as Analytics | null;
  const stats = overviewRaw as AdminOverview | null;
  const daily = (series as AdminDailyPoint[]) ?? [];
  const badge = (badgeRaw ?? {}) as {
    total?: number;
    window?: number;
    uniques?: number;
    top?: { slug: string; title: string; clicks: number; uniques: number }[];
  };

  if (!a || !stats) {
    return (
      <Card className="p-10 text-center">
        <p className="type-body text-muted">Couldn&apos;t load platform metrics.</p>
      </Card>
    );
  }

  return (
    <div>
      <RangeFilter />

      {/* Work needing a decision comes before any number — a dashboard should
          surface what to do, not only what happened. */}
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
                <Button size="sm" variant="secondary">Curate</Button>
              </Link>
            </Card>
          )}
        </div>
      )}

      <AdminSection
        title={`Last ${days} days`}
        description="Each figure against the same length of time immediately before it."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TrendStat label="Revenue" value={inr(a.current.revenue_inr)} current={a.current.revenue_inr} previous={a.previous.revenue_inr} />
          <TrendStat label="New accounts" value={a.current.signups} current={a.current.signups} previous={a.previous.signups} />
          <TrendStat label="New invitations" value={a.current.invites} current={a.current.invites} previous={a.previous.invites} />
          <TrendStat label="Published" value={a.current.published} current={a.current.published} previous={a.previous.published} />
          <TrendStat label="Invite views" value={compact(a.current.views)} current={a.current.views} previous={a.previous.views} />
          <TrendStat label="RSVPs" value={a.current.rsvps} current={a.current.rsvps} previous={a.previous.rsvps} />
          <TrendStat label="Paid orders" value={a.current.orders} current={a.current.orders} previous={a.previous.orders} />
          <TrendStat label="Badge clicks" value={a.current.badge_clicks} current={a.current.badge_clicks} previous={a.previous.badge_clicks} />
        </div>
      </AdminSection>

      <div className="mb-10 flex flex-col gap-6">
        {/* Separate charts on separate scales. Never a dual axis: two y-scales
            make any crossing point meaningless. */}
        <TrendChart
          title={`Revenue · last ${days} days`}
          caption={`${inr(a.current.revenue_inr)} across ${a.current.orders} paid order${a.current.orders === 1 ? "" : "s"}`}
          data={daily}
          series={[{ key: "revenue_inr", label: "Revenue" }]}
          format="inrCompact"
        />

        <TrendChart
          title={`Signups & new invitations · last ${days} days`}
          caption={`${a.current.signups} accounts and ${a.current.invites} invitations`}
          data={daily}
          series={[
            { key: "signups", label: "Signups" },
            { key: "invites", label: "Invitations" },
          ]}
        />

        <TrendChart
          title={`Invite views · last ${days} days`}
          caption="Every guest opening any published invitation"
          data={daily}
          series={[{ key: "views", label: "Views" }]}
          format="compact"
        />
      </div>

      <AdminSection
        title="Breakdowns"
        description="All-time rather than windowed — what people use Amantrika for is a question about the product, not about this month."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <BreakdownBars title="By occasion" caption="Which celebrations invitations are made for" rows={a.by_occasion} />
          <BreakdownBars title="By theme" caption="The most-chosen themes" rows={a.by_theme} />
          <BreakdownBars title="By status" caption="How many make it from draft to published" rows={a.by_status} />
          <BreakdownBars title="Revenue by plan" caption="Paid orders and what they brought in" rows={a.by_plan} emptyLabel="No paid orders yet." />
        </div>
      </AdminSection>

      <AdminSection
        title="Made with Amantrika"
        description="Guests who tapped the badge on a free invitation and came back — the product's only organic acquisition loop."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Clicks (all time)" value={badge.total ?? 0} />
          <Stat label={`Clicks (${days} days)`} value={badge.window ?? 0} />
          <Stat label={`Unique people (${days} days)`} value={badge.uniques ?? 0} />
        </div>

        {(badge.top?.length ?? 0) > 0 && (
          <div className="mt-4">
            <Table headers={["Invitation", "Link", "Clicks", "Unique people"]}>
              {badge.top!.map((row) => (
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

      <AdminSection title="All time" description="Totals across the whole platform.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Accounts" value={stats.profiles_total} />
          <Stat label="Invitations" value={stats.events_total} />
          <Stat label="Published" value={stats.events_published} />
          <Stat label="Revenue" value={inr(stats.revenue_inr)} />
          <Stat label="Partners" value={stats.agents_total} />
          <Stat label="Commission owed" value={inr(stats.commission_owed_inr)} />
          <Stat label="Guests invited" value={stats.guests_total} />
          <Stat label="Invite views" value={compact(stats.views_total)} />
        </div>
      </AdminSection>
    </div>
  );
}
