import { expect, test } from "@playwright/test";

/**
 * Secrets that reach the browser are the failure mode you find out about from
 * somebody else. These assertions are cheap and worth running on every push.
 */

const PUBLIC_PAGES = ["/", "/blog", "/login", "/showcase"];

/** Values that must never appear in anything the browser downloads. */
function forbiddenSecrets(): Array<{ name: string; value: string }> {
  return [
    { name: "SUPABASE_SERVICE_ROLE_KEY", value: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "" },
    { name: "RESEND_API_KEY", value: process.env.RESEND_API_KEY ?? "" },
    { name: "DODO_API_KEY", value: process.env.DODO_API_KEY ?? "" },
    { name: "DODO_WEBHOOK_SECRET", value: process.env.DODO_WEBHOOK_SECRET ?? "" },
    { name: "PAYMENT_WEBHOOK_SECRET", value: process.env.PAYMENT_WEBHOOK_SECRET ?? "" },
  ].filter((secret) => secret.value.length > 0);
}

test.describe("no server-only secret reaches the browser", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} and its scripts are clean`, async ({ page }) => {
      const secrets = forbiddenSecrets();
      expect(secrets.length, "no secrets loaded from .env.local to check against").toBeGreaterThan(
        0
      );

      const downloaded: string[] = [];

      page.on("response", async (response) => {
        const type = response.headers()["content-type"] ?? "";
        if (!type.includes("javascript") && !type.includes("html")) return;
        try {
          downloaded.push(await response.text());
        } catch {
          // Redirects and cached responses have no body to read.
        }
      });

      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const haystack = downloaded.join("\n");
      for (const secret of secrets) {
        expect(haystack, `${secret.name} leaked into a browser payload`).not.toContain(
          secret.value
        );
      }
    });
  }
});

test.describe("the payment webhook", () => {
  test("rejects an unsigned request", async ({ request }) => {
    const response = await request.post("/api/payments/webhook", {
      data: { type: "payment.succeeded", order_id: "x", payment_id: "y", amount_minor: 1 },
    });

    expect(response.status()).toBe(400);
  });

  test("does not explain why it refused", async ({ request }) => {
    const response = await request.post("/api/payments/webhook", {
      headers: {
        "content-type": "application/json",
        "x-mock-webhook-id": "probe",
        "x-mock-timestamp": String(Math.floor(Date.now() / 1000)),
        "x-mock-signature": "wrong",
      },
      data: { type: "payment.succeeded" },
    });

    const body = await response.text();

    // A forger should learn nothing from the response about what to fix.
    expect(body).not.toMatch(/timestamp|secret|hmac|mismatch|missing/i);
  });
});
