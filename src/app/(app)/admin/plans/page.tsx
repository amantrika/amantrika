import { createClient } from "@/lib/supabase/server";
import { PlansEditor, type PlanEditRow } from "./PlansEditor";

/**
 * Pricing is the one piece of marketing copy that lives in Postgres rather than
 * in MDX, because checkout reads it. Everything else content-shaped stays in
 * `content/` under version control.
 */
export default async function AdminPlansPage() {
  const supabase = await createClient();
  const { data: plans } = await supabase.from("plans").select("*").order("sort_order");

  const { data: orders } = await supabase.from("orders").select("plan_code, amount_inr, status");
  const sold = new Map<string, { count: number; revenue: number }>();
  for (const o of orders ?? []) {
    if (o.status !== "paid") continue;
    const cur = sold.get(o.plan_code) ?? { count: 0, revenue: 0 };
    sold.set(o.plan_code, { count: cur.count + 1, revenue: cur.revenue + o.amount_inr });
  }

  const rows: PlanEditRow[] = (plans ?? []).map((p) => ({
    code: p.code,
    name: p.name,
    priceInr: p.price_inr,
    description: p.description,
    features: p.features ?? [],
    isActive: p.is_active,
    soldCount: sold.get(p.code)?.count ?? 0,
    revenueInr: sold.get(p.code)?.revenue ?? 0,
  }));

  return <PlansEditor rows={rows} />;
}
