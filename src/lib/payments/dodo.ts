import "server-only";
import DodoPayments from "dodopayments";
import { Webhook } from "standardwebhooks";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
  ProviderOrderStatus,
  WebhookVerification,
} from "@/lib/payments/provider";

/**
 * DodoPayments is a merchant of record: it collects and remits GST and
 * international tax, which is what makes it worth the integration for a product
 * selling to Indian hosts and NRI relatives from one storefront.
 *
 * Everything provider-specific lives in this file. If Dodo is ever replaced,
 * nothing outside it changes.
 */

/**
 * Test and live are separate businesses with separate catalogues, so a live key
 * cannot accidentally charge against a test product. The key itself decides:
 * `live.dodopayments.com` rejects a test key with 401.
 */
function environment(): "test_mode" | "live_mode" {
  return process.env.DODO_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode";
}

let client: DodoPayments | null = null;

function dodo(): DodoPayments {
  if (!client) {
    const bearerToken = process.env.DODO_API_KEY;
    if (!bearerToken) throw new Error("Missing DODO_API_KEY.");
    client = new DodoPayments({ bearerToken, environment: environment() });
  }
  return client;
}

let verifier: Webhook | null = null;

function webhookVerifier(): Webhook {
  if (!verifier) {
    const secret = process.env.DODO_WEBHOOK_SECRET;
    if (!secret) throw new Error("Missing DODO_WEBHOOK_SECRET.");
    verifier = new Webhook(secret);
  }
  return verifier;
}

/** The shape we rely on. Dodo sends more; we read only these. */
type DodoWebhookEnvelope = {
  type?: string;
  data?: {
    payload_type?: string;
    payment_id?: string;
    total_amount?: number;
    currency?: string;
    metadata?: Record<string, string> | null;
  };
};

export class DodoPaymentProvider implements PaymentProvider {
  readonly name = "dodo" as const;

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const { order, customer, successUrl, cancelUrl } = input;

    if (!order.provider_product_id) {
      throw new Error(
        `Plan "${order.plan_code}" has no dodo_product_id — it cannot be sold through Dodo.`
      );
    }

    const session = await dodo().checkoutSessions.create({
      product_cart: [{ product_id: order.provider_product_id, quantity: 1 }],
      customer: { email: customer.email, name: customer.name },
      return_url: successUrl,
      cancel_url: cancelUrl,
      billing_currency: order.currency as "INR",
      // The only link back to our own records. The webhook reads it to decide
      // which order settled, so it must round-trip untouched.
      metadata: { order_id: order.id, plan_code: order.plan_code },
      // UPI is non-negotiable for the Indian market; cards stay as the fallback
      // Dodo requires, or checkout fails when UPI is unavailable to the buyer.
      allowed_payment_method_types: ["upi_collect", "upi_intent", "credit", "debit"],
    });

    if (!session.checkout_url) {
      throw new Error("Dodo returned a checkout session with no checkout_url.");
    }

    return { providerOrderId: session.session_id, checkoutUrl: session.checkout_url };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookVerification> {
    const id = headers.get("webhook-id");
    const timestamp = headers.get("webhook-timestamp");
    const signature = headers.get("webhook-signature");

    if (!id || !timestamp || !signature) {
      return { valid: false, reason: "missing standard-webhooks headers" };
    }

    // Verifies the HMAC over `id.timestamp.body` and enforces the timestamp
    // tolerance. Throws on any failure, including replay.
    try {
      webhookVerifier().verify(rawBody, {
        "webhook-id": id,
        "webhook-timestamp": timestamp,
        "webhook-signature": signature,
      });
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : "verification failed";
      return { valid: false, reason };
    }

    let envelope: DodoWebhookEnvelope;
    try {
      envelope = JSON.parse(rawBody) as DodoWebhookEnvelope;
    } catch {
      return { valid: false, reason: "body is not JSON" };
    }

    const event = mapEventType(envelope.type);
    if (!event) {
      return { valid: false, reason: `unhandled event type ${envelope.type ?? "(none)"}` };
    }

    const data = envelope.data ?? {};
    const paymentId = data.payment_id;
    if (!paymentId) {
      return { valid: false, reason: "payload has no payment_id" };
    }

    return {
      valid: true,
      eventId: id,
      event,
      // Absent on refunds, where Dodo does not echo the original metadata. The
      // handler falls back to matching on providerPaymentId.
      providerOrderId: data.metadata?.order_id ?? "",
      providerPaymentId: paymentId,
      amountMinor: data.total_amount ?? 0,
      currency: data.currency ?? "INR",
    };
  }

  /**
   * Takes a Dodo *payment* id, not the session id — a session that was never
   * paid has no status worth reporting. Callers reconciling an order pass
   * `orders.provider_payment_id`.
   *
   * Nothing in the request path uses this: the dashboard polls our own order
   * row, which the webhook owns. It exists for reconciliation and support.
   */
  async getOrderStatus(providerPaymentId: string): Promise<ProviderOrderStatus> {
    const payment = await dodo().payments.retrieve(providerPaymentId);
    switch (payment.status) {
      case "succeeded":
        return "paid";
      case "failed":
      case "cancelled":
        return "failed";
      default:
        return "created";
    }
  }
}

type NormalisedEvent = "payment.succeeded" | "payment.failed" | "refund.issued";

function mapEventType(type: string | undefined): NormalisedEvent | null {
  switch (type) {
    case "payment.succeeded":
      return "payment.succeeded";
    case "payment.failed":
      return "payment.failed";
    case "refund.succeeded":
      return "refund.issued";
    default:
      return null;
  }
}
