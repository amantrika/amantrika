import { expect, test } from "@playwright/test";
import { createDraftEvent, createTestHost } from "./helpers/supabase";

/**
 * `/invite/[slug]` is the product. These tests guard the two things that make
 * it one: it must be fast, and it must never leak an unpublished draft.
 */

const PUBLISHED_SLUG = "demo-aarav-weds-priya";

test.describe("a published invitation", () => {
  test("renders server-side, with no client fetch for first paint", async ({ page }) => {
    const response = await page.goto(`/invite/${PUBLISHED_SLUG}`);

    expect(response?.status()).toBe(200);

    // The names must be in the HTML the server sent, not painted in later.
    const html = await response!.text();
    expect(html).toContain("Aarav");
  });

  test("sets lang and a document title", async ({ page }) => {
    await page.goto(`/invite/${PUBLISHED_SLUG}`);

    await expect(page.locator("html")).toHaveAttribute("lang", /.+/);
    expect(await page.title()).not.toBe("");
  });

  test("does not load the Google Maps SDK", async ({ page }) => {
    const mapRequests: string[] = [];
    page.on("request", (request) => {
      if (/maps\.googleapis\.com|maps\.google\.com/.test(request.url())) {
        mapRequests.push(request.url());
      }
    });

    await page.goto(`/invite/${PUBLISHED_SLUG}`);
    await page.waitForLoadState("networkidle");

    // §2: static map image plus a deep link, never the JS SDK on this route.
    expect(mapRequests).toEqual([]);
  });

  test("stays inside the client JavaScript budget", async ({ page }) => {
    let scriptBytes = 0;

    page.on("response", async (response) => {
      const type = response.headers()["content-type"] ?? "";
      if (!type.includes("javascript")) return;

      const length = Number(response.headers()["content-length"] ?? 0);
      if (Number.isFinite(length)) scriptBytes += length;
    });

    await page.goto(`/invite/${PUBLISHED_SLUG}`);
    await page.waitForLoadState("networkidle");

    const kilobytes = Math.round(scriptBytes / 1024);
    console.log(`[budget] /invite/${PUBLISHED_SLUG} shipped ~${kilobytes}KB of JavaScript`);

    // The budget in CLAUDE.md §2 is 100KB gzipped on this route.
    expect(kilobytes).toBeLessThanOrEqual(100);
  });
});

test.describe("an unpublished invitation", () => {
  test("is not reachable by guessing its slug", async ({ page }) => {
    const host = await createTestHost();
    const draft = await createDraftEvent(host);

    const response = await page.goto(`/invite/${draft.slug}`);

    // A draft is somebody's unfinished, unpaid work. It must not render.
    expect(response?.status()).toBe(404);
  });

  test("an unknown slug 404s", async ({ page }) => {
    const response = await page.goto("/invite/definitely-not-a-real-invitation");
    expect(response?.status()).toBe(404);
  });
});
