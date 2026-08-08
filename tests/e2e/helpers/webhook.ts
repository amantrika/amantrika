import { createHmac, randomUUID } from "node:crypto";

/**
 * Signs mock webhooks the way the app does.
 *
 * Deliberately re-implemented rather than imported from
 * `src/lib/payments/mock.ts`: if a bug were introduced into the signing helper,
 * importing it would make the test agree with the bug.
 */
export function signedDelivery(body: unknown, options: { id?: string; timestamp?: number } = {}) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) throw new Error("E2E tests need PAYMENT_WEBHOOK_SECRET in .env.local.");

  const payload = JSON.stringify(body);
  const id = options.id ?? randomUUID();
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret)
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");

  return {
    payload,
    id,
    headers: {
      "content-type": "application/json",
      "x-mock-webhook-id": id,
      "x-mock-timestamp": String(timestamp),
      "x-mock-signature": signature,
    },
  };
}

export function paymentSucceeded(orderId: string, amountMinor: number) {
  return {
    type: "payment.succeeded",
    order_id: orderId,
    payment_id: `mock_pay_${orderId.slice(0, 8)}`,
    amount_minor: amountMinor,
    currency: "INR",
  };
}
