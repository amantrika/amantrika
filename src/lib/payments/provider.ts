import "server-only";

/**
 * The trust boundary, expressed as one interface.
 *
 * Business logic imports `getPaymentProvider()` and never a concrete class, so
 * swapping the mock for Dodo touches exactly two files — `mock.ts` and
 * `dodo.ts`. Orders, pricing, the webhook route and the SKU effects never learn
 * which provider took the money.
 */
export type PaymentProviderName = "mock" | "dodo";

/** What the checkout needs to know about the order being paid for. */
export type CheckoutOrder = {
  id: string;
  /** Rupees, already computed by `src/lib/pricing.ts`. Never client-supplied. */
  amount_inr: number;
  currency: string;
  plan_code: string;
  plan_name: string;
  /** The provider's catalogue id for this plan. Null for free plans. */
  provider_product_id: string | null;
};

export type CreateCheckoutInput = {
  order: CheckoutOrder;
  customer: { email: string; name: string };
  successUrl: string;
  cancelUrl: string;
};

export type CreateCheckoutResult = {
  /** The provider's own handle for this attempt. Stored on the order. */
  providerOrderId: string;
  /** Where to send the browser. Always present for both providers today. */
  checkoutUrl: string;
};

/**
 * A verified webhook, normalised. `providerOrderId` is our own order id, which
 * both providers round-trip through their metadata — matching on it is what
 * lets the handler stay provider-agnostic.
 */
export type VerifiedWebhook = {
  valid: true;
  /** The provider's delivery id. The idempotency key for `payment_events`. */
  eventId: string;
  event: "payment.succeeded" | "payment.failed" | "refund.issued";
  providerOrderId: string;
  providerPaymentId: string;
  /** Minor units — paise for INR. */
  amountMinor: number;
  currency: string;
};

export type WebhookVerification = { valid: false; reason: string } | VerifiedWebhook;

export type ProviderOrderStatus = "created" | "paid" | "failed" | "refunded";

export interface PaymentProvider {
  readonly name: PaymentProviderName;

  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;

  /**
   * Given the *raw, unparsed* request body and its headers, decide whether this
   * delivery genuinely came from the provider. Must never throw on malformed
   * input — a forged body is an expected condition, not an exception.
   */
  verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookVerification>;

  getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus>;
}
