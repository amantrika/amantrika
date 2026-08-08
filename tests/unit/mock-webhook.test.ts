import { beforeEach, describe, expect, it } from "vitest";
import { MockPaymentProvider, mockWebhookHeaders, signMockWebhook } from "@/lib/payments/mock";

/**
 * The mock provider's signature check is the same shape as Dodo's, so these
 * tests are really about the verification contract: what must be refused.
 */

const SECRET = "test-secret-not-used-anywhere-real";

beforeEach(() => {
  process.env.PAYMENT_WEBHOOK_SECRET = SECRET;
});

const provider = new MockPaymentProvider();

const body = JSON.stringify({
  type: "payment.succeeded",
  order_id: "11111111-1111-4111-8111-111111111111",
  payment_id: "mock_pay_1",
  amount_minor: 299900,
  currency: "INR",
});

function headersFor(overrides: Record<string, string> = {}, payload = body) {
  const id = "delivery-1";
  const timestamp = Math.floor(Date.now() / 1000);
  return new Headers({ ...mockWebhookHeaders(id, timestamp, payload), ...overrides });
}

describe("MockPaymentProvider.verifyWebhook", () => {
  it("accepts a correctly signed delivery", async () => {
    const result = await provider.verifyWebhook(body, headersFor());

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.event).toBe("payment.succeeded");
    expect(result.providerOrderId).toBe("11111111-1111-4111-8111-111111111111");
    expect(result.amountMinor).toBe(299900);
  });

  it("refuses a body altered after signing", async () => {
    const headers = headersFor();
    const tampered = body.replace('"amount_minor":299900', '"amount_minor":1');

    const result = await provider.verifyWebhook(tampered, headers);
    expect(result).toMatchObject({ valid: false });
  });

  it("refuses a signature made with a different secret", async () => {
    const id = "delivery-1";
    const timestamp = Math.floor(Date.now() / 1000);
    process.env.PAYMENT_WEBHOOK_SECRET = "a-different-secret";
    const foreign = signMockWebhook({ id, timestamp, body });

    process.env.PAYMENT_WEBHOOK_SECRET = SECRET;
    const headers = new Headers({
      "x-mock-webhook-id": id,
      "x-mock-timestamp": String(timestamp),
      "x-mock-signature": foreign,
    });

    const result = await provider.verifyWebhook(body, headers);
    expect(result).toMatchObject({ valid: false });
  });

  it("refuses a replay from outside the timestamp window", async () => {
    const id = "delivery-old";
    const timestamp = Math.floor(Date.now() / 1000) - 3600;
    const headers = new Headers({
      "x-mock-webhook-id": id,
      "x-mock-timestamp": String(timestamp),
      "x-mock-signature": signMockWebhook({ id, timestamp, body }),
    });

    const result = await provider.verifyWebhook(body, headers);
    expect(result).toMatchObject({ valid: false });
  });

  it.each(["x-mock-webhook-id", "x-mock-timestamp", "x-mock-signature"])(
    "refuses a delivery missing %s",
    async (missing) => {
      const headers = headersFor();
      headers.delete(missing);

      const result = await provider.verifyWebhook(body, headers);
      expect(result).toMatchObject({ valid: false });
    }
  );

  it("refuses a signed body that is not JSON", async () => {
    const payload = "not json at all";
    const result = await provider.verifyWebhook(payload, headersFor({}, payload));
    expect(result).toMatchObject({ valid: false });
  });

  it("refuses a signed body missing the fields the handler needs", async () => {
    const payload = JSON.stringify({ type: "payment.succeeded" });
    const result = await provider.verifyWebhook(payload, headersFor({}, payload));
    expect(result).toMatchObject({ valid: false });
  });

  it("signs over the id and timestamp, not the body alone", async () => {
    // Same body, different delivery id — the signatures must differ, or a
    // captured delivery could be replayed under a fresh id.
    const timestamp = Math.floor(Date.now() / 1000);
    const a = signMockWebhook({ id: "one", timestamp, body });
    const b = signMockWebhook({ id: "two", timestamp, body });

    expect(a).not.toBe(b);
  });
});

describe("MockPaymentProvider.createCheckout", () => {
  it("points at the internal mock checkout page, never at a real processor", async () => {
    const result = await provider.createCheckout({
      order: {
        id: "22222222-2222-4222-8222-222222222222",
        amount_inr: 2999,
        currency: "INR",
        plan_code: "classic",
        plan_name: "Classic",
        provider_product_id: null,
      },
      customer: { email: "host@example.com", name: "Host" },
      successUrl: "https://example.com/ok",
      cancelUrl: "https://example.com/cancel",
    });

    expect(result.checkoutUrl).toContain("/checkout/mock/22222222-2222-4222-8222-222222222222");
  });
});
