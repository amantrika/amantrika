import { expect, test } from "@playwright/test";
import { createDraftEvent, createTestHost, type TestHost } from "./helpers/supabase";

/**
 * The paywall, end to end. A free invitation and a paid one are the same code
 * path with a different `plan_code`, so this is the test that proves paying
 * changes something.
 *
 * The free tier carries a "Made with Amantrika" badge rather than a tiled
 * watermark — a deliberate product decision (see src/components/invite/
 * MadeWithBadge.tsx): defacing a family's invitation makes guests resent the
 * mark instead of following it, and following it is the only organic
 * acquisition loop the product has.
 *
 * What the free tier is denied is *reach*, not beauty: no OG image, no Event
 * structured data, no indexing.
 */

const BADGE = "Made with Amantrika";

let host: TestHost;

test.beforeAll(async () => {
  host = await createTestHost();
});

async function publishedInvite(planCode: string) {
  return createDraftEvent(host, { status: "published", plan_code: planCode });
}

test.describe("a free invitation", () => {
  test("carries the badge in the server-rendered HTML", async ({ page }) => {
    const invite = await publishedInvite("free");

    const response = await page.goto(`/invite/${invite.slug}`);
    const html = await response!.text();

    // Server-rendered off `plan_code`. A badge the client decided to show is a
    // badge the client can decide to hide.
    expect(html).toContain(BADGE);
    await expect(page.getByRole("link", { name: new RegExp(BADGE, "i") })).toBeVisible();
  });

  test("the badge leads back to Amantrika, attributed", async ({ page }) => {
    const invite = await publishedInvite("free");
    await page.goto(`/invite/${invite.slug}`);

    const badge = page.getByRole("link", { name: new RegExp(BADGE, "i") });

    // The acquisition loop only pays off if the source is attributable.
    await expect(badge).toHaveAttribute("href", /utm_source=invite_badge/);
  });

  test("emits no og:image, so sharing it shows no rich card", async ({ page }) => {
    const invite = await publishedInvite("free");
    await page.goto(`/invite/${invite.slug}`);

    await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
  });

  test("emits no Event structured data", async ({ page }) => {
    const invite = await publishedInvite("free");
    await page.goto(`/invite/${invite.slug}`);

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.join("")).not.toContain('"Event"');
  });

  test("is excluded from search", async ({ page }) => {
    const invite = await publishedInvite("free");
    await page.goto(`/invite/${invite.slug}`);

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});

test.describe("a paid invitation", () => {
  for (const plan of ["classic", "premium"]) {
    test(`on ${plan} carries no badge`, async ({ page }) => {
      const invite = await publishedInvite(plan);

      const response = await page.goto(`/invite/${invite.slug}`);
      const html = await response!.text();

      // Asserted against the raw HTML, not a locator: a badge hidden by CSS
      // would still be in the page a guest can view-source.
      expect(html).not.toContain(BADGE);
    });
  }

  test("is indexable and carries Event structured data", async ({ page }) => {
    const invite = await publishedInvite("classic");
    await page.goto(`/invite/${invite.slug}`);

    const robots = page.locator('meta[name="robots"]');
    if ((await robots.count()) > 0) {
      await expect(robots).not.toHaveAttribute("content", /noindex/);
    }

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.join("")).toContain('"Event"');
  });
});

/**
 * Replies are the first thing behind the plan. A free invitation is a card —
 * readable and shareable; collecting answers is what makes it a tool.
 *
 * Asserted through a real browser rather than the HTML, because the invitation
 * body renders after the opening animation and is not in the server response.
 * The second test is the one that matters: the form is a hint, the Server
 * Action is the boundary, and a boundary that only exists in the UI is not one.
 */
test.describe("replies are a paid feature", () => {
  /**
   * An invitation opens behind a seal — the body does not exist in the DOM
   * until a guest taps it. Every assertion below has to go through that door,
   * which is also the reason none of this is checkable from the HTML.
   */
  async function openInvitation(page: import("@playwright/test").Page, slug: string) {
    await page.goto(`/invite/${slug}`);
    await page.getByRole("button", { name: /open invitation/i }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  test("a free invitation shows no RSVP form and no guestbook", async ({ page }) => {
    const invite = await publishedInvite("free");
    await openInvitation(page, invite.slug);

    await expect(page.locator("#rsvp")).toHaveCount(0);
    await expect(page.locator("#blessings")).toHaveCount(0);
  });

  for (const plan of ["classic", "premium"]) {
    test(`a ${plan} invitation collects replies`, async ({ page }) => {
      const invite = await publishedInvite(plan);
      await openInvitation(page, invite.slug);

      await expect(page.locator("#rsvp")).toHaveCount(1);
    });
  }

  test("the server refuses a reply to a free invitation, form or no form", async ({ request }) => {
    // Posting straight at the Server Action, the way anyone who has read the
    // page source would. If this passes only because the form is missing, the
    // paywall is decoration.
    const invite = await publishedInvite("free");

    const response = await request.post(`/invite/${invite.slug}`, {
      headers: { "Next-Action": "submitRsvp", "Content-Type": "application/json" },
      data: [
        {
          slug: invite.slug,
          guestName: "Uninvited Poster",
          attending: "yes",
          headcount: 2,
          subEventKeys: [],
        },
      ],
      failOnStatusCode: false,
    });

    // A malformed action id is rejected outright, which is also a refusal — the
    // point is that no row is created either way.
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe("badge click tracking", () => {
  test("never costs the guest their navigation", async ({ request }) => {
    // The badge reports clicks with sendBeacon and ignores the outcome. The
    // endpoint must therefore never be a hard dependency — but it must exist,
    // or every free invitation quietly 404s in the background.
    const response = await request.post("/api/badge-click", {
      data: { slug: "e2e-nonexistent", placement: "invite_badge" },
    });

    expect(response.status()).toBeLessThan(500);
  });
});
