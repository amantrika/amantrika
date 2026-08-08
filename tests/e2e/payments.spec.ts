import { expect, test } from "@playwright/test";
import { signIn } from "./helpers/auth";
import { paymentSucceeded, signedDelivery } from "./helpers/webhook";
import {
  createDraftEvent,
  createPendingOrder,
  createTestHost,
  getEvent,
  getOrder,
  type TestHost,
} from "./helpers/supabase";

/**
 * The rules under test, from CLAUDE.md §2:
 *   - payment truth is the webhook, never the browser
 *   - the handler is idempotent by provider payment id
 *   - a forged signature changes nothing
 */

const WEBHOOK = "/api/payments/webhook";

let host: TestHost;

test.beforeAll(async () => {
  host = await createTestHost();
});

test.describe("the mock checkout drives the real webhook", () => {
  test("simulating success publishes the invitation", async ({ page }) => {
    const event = await createDraftEvent(host);
    const order = await createPendingOrder(host, event.id);

    await signIn(page, host);
    await page.goto(`/checkout/mock/${order.id}`);

    await expect(page.getByText(/TEST MODE|Test mode/i)).toBeVisible();
    await expect(page.getByText("₹2,999")).toBeVisible();

    await page.getByRole("button", { name: "Simulate success" }).click();
    await page.waitForURL(/\/dashboard\//, { timeout: 30_000 });

    const settled = await getOrder(order.id);
    expect(settled?.status).toBe("paid");
    expect(settled?.paid_at).not.toBeNull();

    const published = await getEvent(event.id);
    expect(published?.status).toBe("published");
    expect(published?.published_at).not.toBeNull();
  });

  test("a host cannot open someone else's checkout", async ({ page }) => {
    const stranger = await createTestHost();
    const theirEvent = await createDraftEvent(stranger);
    const theirOrder = await createPendingOrder(stranger, theirEvent.id);

    await signIn(page, host);
    const response = await page.goto(`/checkout/mock/${theirOrder.id}`);

    expect(response?.status()).toBe(404);
    expect((await getOrder(theirOrder.id))?.status).toBe("pending");
  });
});

test.describe("the webhook refuses what it cannot verify", () => {
  test("a forged signature changes nothing", async ({ request }) => {
    const event = await createDraftEvent(host);
    const order = await createPendingOrder(host, event.id);

    const response = await request.post(WEBHOOK, {
      headers: {
        "content-type": "application/json",
        "x-mock-webhook-id": "forged",
        "x-mock-timestamp": String(Math.floor(Date.now() / 1000)),
        "x-mock-signature": "this-is-not-a-real-signature",
      },
      data: paymentSucceeded(order.id, order.amount_inr * 100),
    });

    expect(response.status()).toBe(400);
    expect((await getOrder(order.id))?.status).toBe("pending");
    expect((await getEvent(event.id))?.status).toBe("draft");
  });

  test("a body altered after signing changes nothing", async ({ request }) => {
    const event = await createDraftEvent(host);
    const order = await createPendingOrder(host, event.id);

    const genuine = signedDelivery(paymentSucceeded(order.id, order.amount_inr * 100));
    const tampered = genuine.payload.replace(/"amount_minor":\d+/, '"amount_minor":1');

    const response = await request.post(WEBHOOK, {
      headers: genuine.headers,
      data: tampered,
    });

    expect(response.status()).toBe(400);
    expect((await getOrder(order.id))?.status).toBe("pending");
    expect((await getEvent(event.id))?.status).toBe("draft");
  });

  test("a validly signed underpayment is refused and the invitation stays draft", async ({
    request,
  }) => {
    const event = await createDraftEvent(host);
    const order = await createPendingOrder(host, event.id);

    // Correctly signed, but claiming ₹1 was collected against a ₹2,999 order.
    const delivery = signedDelivery(paymentSucceeded(order.id, 100));

    const response = await request.post(WEBHOOK, {
      headers: delivery.headers,
      data: delivery.payload,
    });

    expect(response.status()).toBe(400);

    const failed = await getOrder(order.id);
    expect(failed?.status).toBe("failed");
    expect(failed?.failure_reason).toBe("amount mismatch");
    expect(failed?.paid_at).toBeNull();

    expect((await getEvent(event.id))?.status).toBe("draft");
  });

  test("an expired timestamp is refused", async ({ request }) => {
    const event = await createDraftEvent(host);
    const order = await createPendingOrder(host, event.id);

    const delivery = signedDelivery(paymentSucceeded(order.id, order.amount_inr * 100), {
      timestamp: Math.floor(Date.now() / 1000) - 3600,
    });

    const response = await request.post(WEBHOOK, {
      headers: delivery.headers,
      data: delivery.payload,
    });

    expect(response.status()).toBe(400);
    expect((await getOrder(order.id))?.status).toBe("pending");
  });
});

test.describe("the webhook is idempotent", () => {
  test("replaying a delivery settles the order exactly once", async ({ request }) => {
    const event = await createDraftEvent(host);
    const order = await createPendingOrder(host, event.id);

    const delivery = signedDelivery(paymentSucceeded(order.id, order.amount_inr * 100));

    const first = await request.post(WEBHOOK, {
      headers: delivery.headers,
      data: delivery.payload,
    });
    expect(first.status()).toBe(200);
    expect(await first.json()).toMatchObject({ ok: true });

    const settled = await getOrder(order.id);
    expect(settled?.status).toBe("paid");
    const firstPaidAt = settled?.paid_at;

    // Byte-identical replay, as a provider retry would send.
    const second = await request.post(WEBHOOK, {
      headers: delivery.headers,
      data: delivery.payload,
    });
    expect(second.status()).toBe(200);
    expect(await second.json()).toMatchObject({ duplicate: true });

    // Nothing moved the second time.
    expect((await getOrder(order.id))?.paid_at).toBe(firstPaidAt);
  });
});
