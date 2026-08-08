import { expect, test } from "@playwright/test";
import { createHmac } from "node:crypto";
import { admin, createDraftEvent, createTestHost, type TestHost } from "./helpers/supabase";

/**
 * The scheduler replaced the n8n side-car (CLAUDE.md §2.1: one deployment).
 * What matters is that it cannot be triggered by strangers, and that it cannot
 * email the same person twice.
 */

const JOB = "/api/cron/abandoned-draft";

function cronSecret(): string {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("E2E tests need CRON_SECRET in .env.local.");
  return secret;
}

function authorised() {
  return { authorization: `Bearer ${cronSecret()}` };
}

test.describe("the scheduler is not open to the public", () => {
  test("an unauthenticated call 404s rather than 401s", async ({ request }) => {
    const response = await request.get(JOB);

    // 401 would confirm the route exists. It should not even do that.
    expect(response.status()).toBe(404);
  });

  test("a wrong secret is refused", async ({ request }) => {
    const response = await request.get(JOB, {
      headers: { authorization: "Bearer definitely-not-the-secret" },
    });

    expect(response.status()).toBe(404);
  });

  test("an unknown job is refused even when authorised", async ({ request }) => {
    const response = await request.get("/api/cron/does-not-exist", { headers: authorised() });

    expect(response.status()).toBe(404);
  });
});

test.describe("the abandoned-draft job", () => {
  test("reports what it did", async ({ request }) => {
    // Dry run: renders and ledgers, sends nothing. Safe against a live project.
    const response = await request.get(`${JOB}?dryRun=1`, { headers: authorised() });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ job: "05-host-abandoned-draft-nudge", dryRun: true });
    expect(typeof body.considered).toBe("number");
    expect(body.error).toBeUndefined();
  });

  test("claims each message once, so a second run cannot resend it", async ({ request }) => {
    const host = await createTestHost();

    // 30 hours idle puts this in the `draft_24h` bucket, and the helper's draft
    // scores 65 — inside that bucket's 30..70 completion window. Both have to be
    // true or the row is not a candidate at all, and the test would pass by
    // finding nothing rather than by proving the guard works.
    const event = await createDraftEvent(host, {
      status: "draft",
      updated_at: new Date(Date.now() - 30 * 3600_000).toISOString(),
    });

    const isCandidate = async () => {
      const { data } = await admin().rpc("cron_stale_draft_nudges");
      return (data ?? []).some((c: { event_id: string }) => c.event_id === event.id);
    };

    expect(await isCandidate(), "seeded draft should be a candidate first").toBe(true);

    const first = await (await request.get(`${JOB}?dryRun=1`, { headers: authorised() })).json();
    expect(first.error).toBeUndefined();
    expect(first.considered).toBeGreaterThan(0);

    // Claimed, therefore no longer a candidate. This is the guard that makes
    // overlapping schedules and manual runs safe.
    expect(await isCandidate(), "a claimed draft must not be offered again").toBe(false);

    const second = await (await request.get(`${JOB}?dryRun=1`, { headers: authorised() })).json();
    expect(second.error).toBeUndefined();
    expect(second.sent).toBe(0);
  });
});

test.describe("one-click unsubscribe", () => {
  test("refuses a link whose address has been edited", async ({ request }) => {
    const token = createHmac("sha256", cronSecret())
      .update("someone@example.com:nudge")
      .digest("hex");

    // Same signature, different address — the attack this guards against.
    const response = await request.post(
      `/api/unsubscribe?email=${encodeURIComponent("someone-else@example.com")}&scope=nudge&token=${token}`
    );

    expect(response.status()).toBe(403);
  });

  test("honours a correctly signed request immediately", async ({ request }) => {
    const email = `e2e-unsub-${Date.now()}@amantrika-e2e.test`;
    const token = createHmac("sha256", cronSecret()).update(`${email}:nudge`).digest("hex");

    const response = await request.post(
      `/api/unsubscribe?email=${encodeURIComponent(email)}&scope=nudge&token=${token}`
    );

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
  });

  test("the GET link a person clicks says so in plain HTML", async ({ page }) => {
    const email = `e2e-unsub-${Date.now()}@amantrika-e2e.test`;
    const token = createHmac("sha256", cronSecret()).update(`${email}:nudge`).digest("hex");

    await page.goto(
      `/api/unsubscribe?email=${encodeURIComponent(email)}&scope=nudge&token=${token}`
    );

    await expect(page.getByRole("heading", { name: /unsubscribed/i })).toBeVisible();
  });
});
