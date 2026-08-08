"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { mockWebhookHeaders, type MockWebhookBody } from "@/lib/payments/mock";
import { log } from "@/lib/posthog/logger";

const simulateSchema = z.object({
  orderId: z.string().uuid(),
  outcome: z.enum(["succeeded", "failed"]),
});

/**
 * Simulates the processor calling us back — and nothing more.
 *
 * This action has no database grants of its own beyond reading the caller's own
 * order. It builds a signed payload and POSTs it to the real webhook, which
 * verifies the signature, ledgers the delivery and applies the SKU effects.
 * If publishing breaks, it breaks here too, in development, rather than the
 * first time a real customer pays.
 */
export async function simulatePayment(input: {
  orderId: string;
  outcome: "succeeded" | "failed";
}): Promise<{ ok: boolean; error?: string }> {
  if (!mockCheckoutAllowed()) {
    return { ok: false, error: "Mock checkout is disabled." };
  }

  const parsed = simulateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Something's off with that request." };

  const profile = await requireProfile("/dashboard");
  const supabase = await createClient();

  // RLS restricts this to the caller's own orders, so one host can't settle
  // another's — even in a mock.
  const { data: order } = await supabase
    .from("orders")
    .select("id, amount_inr, currency, status, buyer_id")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (!order || order.buyer_id !== profile.id) {
    return { ok: false, error: "We couldn't find that order." };
  }

  const body: MockWebhookBody = {
    type: parsed.data.outcome === "succeeded" ? "payment.succeeded" : "payment.failed",
    order_id: order.id,
    payment_id: `mock_pay_${order.id.slice(0, 8)}`,
    amount_minor: order.amount_inr * 100,
    currency: order.currency ?? "INR",
  };

  const raw = JSON.stringify(body);
  const id = randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);

  let response: Response;
  try {
    response = await fetch(`${await selfOrigin()}/api/payments/webhook`, {
      method: "POST",
      headers: mockWebhookHeaders(id, timestamp, raw),
      body: raw,
      cache: "no-store",
    });
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    log.error("mock webhook could not be delivered", { order_id: order.id, reason });
    return { ok: false, error: "Couldn't reach the webhook." };
  }

  if (!response.ok) {
    log.error("mock webhook was rejected", {
      order_id: order.id,
      status: response.status,
    });
    return { ok: false, error: `Webhook rejected the delivery (${response.status}).` };
  }

  return { ok: true };
}

/**
 * The origin this request actually arrived on — not `NEXT_PUBLIC_SITE_URL`.
 *
 * The mock has to call the server it is running on. Using the configured site
 * URL meant a test server on :3100 posted its signed webhook to :3000, which is
 * whatever else happens to be running — a second dev server, or nothing. It
 * appeared to work only because that other server shared this database, so the
 * assertions passed while the request under test went somewhere else entirely.
 */
async function selfOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return siteUrl;

  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Off in production unless someone deliberately turns it on. A mock checkout
 * reachable on the live site is a free-invitation button.
 */
export async function mockCheckoutEnabled(): Promise<boolean> {
  return mockCheckoutAllowed();
}

function mockCheckoutAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_MOCK_PAYMENTS === "true";
}
