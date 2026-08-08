import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { formatInr } from "@/lib/pricing";
import { MockCheckoutForm } from "./MockCheckoutForm";

export const metadata: Metadata = {
  title: "Test checkout",
  robots: { index: false, follow: false },
};

function mockCheckoutAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_MOCK_PAYMENTS === "true";
}

export default async function MockCheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  if (!mockCheckoutAllowed()) notFound();

  const { orderId } = await params;
  const profile = await requireProfile("/dashboard");
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, amount_inr, plan_code, status, event_id, buyer_id, events(title, slug)")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.buyer_id !== profile.id) notFound();

  const event = Array.isArray(order.events) ? order.events[0] : order.events;

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-16">
      <div className="w-full max-w-md">
        <div
          role="status"
          className="mb-6 rounded-card border-2 border-dashed border-amber-500 bg-amber-50 p-4 text-center dark:bg-amber-950/40"
        >
          <p className="font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
            Test mode — no money moves
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            This page stands in for the payment processor. Both buttons send a signed
            webhook to the same handler a real payment would.
          </p>
        </div>

        <div className="rounded-card bg-surface p-8 shadow-resting">
          <h1 className="font-display text-2xl font-semibold text-primary">
            {event?.title ?? "Your invitation"}
          </h1>

          <dl className="mt-6 flex flex-col gap-2 border-t border-ornate/30 pt-6">
            <div className="flex justify-between">
              <dt className="text-sm">Plan</dt>
              <dd className="text-sm font-medium">{order.plan_code}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm">Amount</dt>
              <dd className="font-display text-xl font-semibold text-primary">
                {formatInr(order.amount_inr)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm">Order</dt>
              <dd className="font-mono text-xs">{order.id.slice(0, 8)}</dd>
            </div>
          </dl>

          {order.status === "paid" ? (
            <p className="mt-6 text-center text-sm text-success">
              This order is already paid.
            </p>
          ) : (
            <MockCheckoutForm orderId={order.id} eventId={order.event_id} />
          )}
        </div>
      </div>
    </main>
  );
}
