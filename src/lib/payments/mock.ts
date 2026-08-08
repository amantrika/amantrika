import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { siteUrl } from "@/lib/env";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
  ProviderOrderStatus,
  WebhookVerification,
} from "@/lib/payments/provider";

/**
 * The point of the mock is that it is *not* a shortcut.
 *
 * "Simulate success" does not write to the database. It POSTs a properly signed
 * payload to the real `/api/payments/webhook`, which verifies the signature,
 * checks idempotency and applies the SKU effects exactly as it will for Dodo.
 * The path money takes in production is the path exercised in development, so
 * swapping providers cannot silently break publishing.
 */

const SIGNATURE_HEADER = "x-mock-signature";
const ID_HEADER = "x-mock-webhook-id";
const TIMESTAMP_HEADER = "x-mock-timestamp";

/** Deliveries older than this are refused, so a captured body can't be replayed. */
const MAX_SKEW_SECONDS = 300;

export type MockWebhookBody = {
  type: "payment.succeeded" | "payment.failed" | "refund.issued";
  order_id: string;
  payment_id: string;
  amount_minor: number;
  currency: string;
};

function secret(): string {
  const value = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!value) {
    throw new Error(
      "Missing PAYMENT_WEBHOOK_SECRET — the mock provider signs its webhooks with it."
    );
  }
  return value;
}

/** Standard-Webhooks-shaped: sign `id.timestamp.body`, never the body alone. */
export function signMockWebhook(input: {
  id: string;
  timestamp: number;
  body: string;
}): string {
  return createHmac("sha256", secret())
    .update(`${input.id}.${input.timestamp}.${input.body}`)
    .digest("base64");
}

/** Headers the mock checkout page sends alongside the signed body. */
export function mockWebhookHeaders(id: string, timestamp: number, body: string) {
  return {
    "content-type": "application/json",
    [ID_HEADER]: id,
    [TIMESTAMP_HEADER]: String(timestamp),
    [SIGNATURE_HEADER]: signMockWebhook({ id, timestamp, body }),
  };
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on a length mismatch, which would itself leak length.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock" as const;

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const providerOrderId = `mock_${input.order.id}`;
    return {
      providerOrderId,
      checkoutUrl: `${siteUrl}/checkout/mock/${input.order.id}`,
    };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookVerification> {
    const id = headers.get(ID_HEADER);
    const timestamp = headers.get(TIMESTAMP_HEADER);
    const signature = headers.get(SIGNATURE_HEADER);

    if (!id || !timestamp || !signature) {
      return { valid: false, reason: "missing signature headers" };
    }

    const sentAt = Number(timestamp);
    if (!Number.isFinite(sentAt)) {
      return { valid: false, reason: "malformed timestamp" };
    }
    if (Math.abs(Date.now() / 1000 - sentAt) > MAX_SKEW_SECONDS) {
      return { valid: false, reason: "timestamp outside tolerance" };
    }

    let expected: string;
    try {
      expected = signMockWebhook({ id, timestamp: sentAt, body: rawBody });
    } catch {
      return { valid: false, reason: "signing secret unavailable" };
    }

    if (!safeEqual(expected, signature)) {
      return { valid: false, reason: "signature mismatch" };
    }

    let body: MockWebhookBody;
    try {
      body = JSON.parse(rawBody) as MockWebhookBody;
    } catch {
      return { valid: false, reason: "body is not JSON" };
    }

    if (!body.order_id || !body.payment_id || !body.type) {
      return { valid: false, reason: "body missing required fields" };
    }

    return {
      valid: true,
      eventId: id,
      event: body.type,
      providerOrderId: body.order_id,
      providerPaymentId: body.payment_id,
      amountMinor: body.amount_minor,
      currency: body.currency ?? "INR",
    };
  }

  /**
   * The mock has no ledger of its own — the order row is the only record. The
   * caller already knows that, so there is nothing truthful to report here.
   */
  async getOrderStatus(): Promise<ProviderOrderStatus> {
    return "created";
  }
}
