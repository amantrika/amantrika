import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import { sendEmail } from "@/lib/email/send";
import { formatInr } from "@/lib/pricing";
import { siteUrl } from "@/lib/env";
import { log } from "@/lib/posthog/logger";

/**
 * The only route in the application that may mark an order paid.
 *
 * The browser callback that follows a successful checkout grants nothing and
 * changes no state — it merely navigates to the dashboard, which polls the order
 * row this handler owns. That separation is the whole trust model: a user who
 * forges a redirect gets a redirect and nothing else.
 */

// The signature covers the exact bytes Dodo sent. Any parser that normalises
// the body first — including Next's automatic JSON handling — invalidates it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const provider = getPaymentProvider();
  const rawBody = await request.text();

  const result = await provider.verifyWebhook(rawBody, request.headers);

  if (!result.valid) {
    // Never echo the reason to the caller: a forger should learn nothing about
    // why their attempt failed.
    log.warn("payment webhook rejected", {
      provider: provider.name,
      reason: result.reason,
    });
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Record the delivery before acting on it. The composite primary key means a
  // provider retry conflicts here and we stop, having done nothing twice.
  const { error: ledgerError } = await supabase.from("payment_events").insert({
    provider: provider.name,
    event_id: result.eventId,
    event_type: result.event,
    payload: JSON.parse(rawBody),
  });

  if (ledgerError) {
    // 23505 = unique_violation: this delivery has already been applied.
    if (ledgerError.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    log.error("payment webhook could not be ledgered", {
      provider: provider.name,
      event_id: result.eventId,
      reason: ledgerError.message,
    });
    // 500 so the provider retries — better a retry than a silently lost payment.
    return NextResponse.json({ error: "ledger write failed" }, { status: 500 });
  }

  const order = await findOrder(supabase, result.providerOrderId, result.providerPaymentId);

  if (!order) {
    log.error("payment webhook matched no order", {
      provider: provider.name,
      event_id: result.eventId,
    });
    // 200: the delivery was genuine and is now ledgered. Retrying won't help.
    return NextResponse.json({ ok: true, matched: false });
  }

  await supabase
    .from("payment_events")
    .update({ order_id: order.id })
    .eq("provider", provider.name)
    .eq("event_id", result.eventId);

  switch (result.event) {
    case "payment.succeeded":
      return settle(supabase, order, result);
    case "payment.failed":
      await supabase
        .from("orders")
        .update({ status: "failed", provider_payment_id: result.providerPaymentId })
        .eq("id", order.id);
      return NextResponse.json({ ok: true });
    case "refund.issued":
      await supabase.from("orders").update({ status: "refunded" }).eq("id", order.id);
      log.warn("order refunded", { order_id: order.id, event_id: order.event_id });
      return NextResponse.json({ ok: true });
  }
}

type OrderRow = {
  id: string;
  event_id: string;
  buyer_id: string;
  plan_code: string;
  amount_inr: number;
  status: string;
};

const ORDER_COLUMNS = "id, event_id, buyer_id, plan_code, amount_inr, status";

/**
 * Dodo echoes our order id in metadata on payments but not on refunds, so fall
 * back to the payment id we recorded when the payment first succeeded.
 */
async function findOrder(
  supabase: ReturnType<typeof createAdminClient>,
  providerOrderId: string,
  providerPaymentId: string
): Promise<OrderRow | null> {
  if (providerOrderId) {
    const { data } = await supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("id", providerOrderId)
      .maybeSingle();
    if (data) return data as OrderRow;
  }

  const { data } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("provider_payment_id", providerPaymentId)
    .maybeSingle();

  return (data as OrderRow | null) ?? null;
}

async function settle(
  supabase: ReturnType<typeof createAdminClient>,
  order: OrderRow,
  result: { providerPaymentId: string; amountMinor: number; currency: string }
) {
  // What the provider actually collected must match what we asked for. A
  // mismatch means either a tampered checkout or a misconfigured product, and
  // publishing on the strength of it would be worse than failing loudly.
  const expectedMinor = order.amount_inr * 100;
  if (result.amountMinor !== expectedMinor) {
    log.error("payment amount mismatch — not settling", {
      order_id: order.id,
      expected_minor: expectedMinor,
      received_minor: result.amountMinor,
    });
    await supabase
      .from("orders")
      .update({ status: "failed", failure_reason: "amount mismatch" })
      .eq("id", order.id);
    return NextResponse.json({ error: "amount mismatch" }, { status: 400 });
  }

  if (order.status === "paid") {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Marking the order paid also accrues the agent's commission, via the
  // orders_accrue_commission trigger.
  const { error: orderError } = await supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      provider_payment_id: result.providerPaymentId,
    })
    .eq("id", order.id);

  if (orderError) {
    log.error("paid order could not be updated", {
      order_id: order.id,
      reason: orderError.message,
    });
    return NextResponse.json({ error: "order update failed" }, { status: 500 });
  }

  // SKU effect for the `invite` SKU: publishing is what was bought.
  const { data: published, error: publishError } = await supabase
    .from("events")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", order.event_id)
    .select("slug, title")
    .maybeSingle();

  if (publishError || !published) {
    // The money is real and the order is paid; only publishing failed. Loud, and
    // recoverable by hand, rather than refunded.
    log.error("order paid but invite not published", {
      order_id: order.id,
      event_id: order.event_id,
      reason: publishError?.message,
    });
    return NextResponse.json({ error: "publish failed" }, { status: 500 });
  }

  revalidatePath(`/invite/${published.slug}`);
  revalidatePath(`/dashboard/${order.event_id}`);

  await sendConfirmation(supabase, order, published.slug, published.title);

  return NextResponse.json({ ok: true });
}

async function sendConfirmation(
  supabase: ReturnType<typeof createAdminClient>,
  order: OrderRow,
  slug: string,
  title: string
) {
  const { data: buyer } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", order.buyer_id)
    .maybeSingle();

  if (!buyer?.email) return;

  const link = `${siteUrl}/invite/${slug}`;
  const amount = formatInr(order.amount_inr);
  const name = buyer.full_name?.split(" ")[0] ?? "there";

  // Idempotent on the order id, so a webhook retry that gets past the ledger
  // still cannot send a second receipt.
  await sendEmail({
    to: buyer.email,
    subject: `Your invitation is live — ${title}`,
    idempotencyKey: `order-paid-${order.id}`,
    text: [
      `Hi ${name},`,
      ``,
      `Your invitation is published and ready to share:`,
      link,
      ``,
      `Plan: ${order.plan_code} · Paid: ${amount}`,
      ``,
      `— Amantrika`,
    ].join("\n"),
    html: [
      `<p>Hi ${name},</p>`,
      `<p>Your invitation is published and ready to share:</p>`,
      `<p><a href="${link}">${link}</a></p>`,
      `<p>Plan: ${order.plan_code} &middot; Paid: ${amount}</p>`,
      `<p>— Amantrika</p>`,
    ].join(""),
  });
}
