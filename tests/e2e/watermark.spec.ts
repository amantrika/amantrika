import { expect, test } from "@playwright/test";
import { WATERMARK_NOTICE } from "@/lib/entitlements";
import { createDraftEvent, createTestHost, type TestHost } from "./helpers/supabase";

/**
 * The paywall, end to end. A free invitation and a paid one are the same code
 * path with a different `plan_code`, so this is the test that proves paying
 * changes something.
 */

let host: TestHost;

test.beforeAll(async () => {
  host = await createTestHost();
});

async function publishedInvite(planCode: string) {
  return createDraftEvent(host, { status: "published", plan_code: planCode });
}

test.describe("a free invitation", () => {
  test("carries the watermark in the server-rendered HTML", async ({ page }) => {
    const invite = await publishedInvite("free");

    const response = await page.goto(`/invite/${invite.slug}`);
    const html = await response!.text();

    // Server-rendered, not painted in by the client — a client-side watermark
    // is one a client can skip.
    expect(html).toContain(WATERMARK_NOTICE);
    await expect(page.getByText(WATERMARK_NOTICE).first()).toBeVisible();
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

  test("cannot be stripped by a rule written against a previous render", async ({ page }) => {
    const invite = await publishedInvite("free");

    const classesOn = async () => {
      await page.goto(`/invite/${invite.slug}`);
      return page.evaluate((notice) => {
        const found: string[] = [];
        document.querySelectorAll<HTMLElement>("*").forEach((node) => {
          if (node.textContent?.trim() === notice && node.className) {
            found.push(node.className);
          }
        });
        return found;
      }, WATERMARK_NOTICE);
    };

    const first = await classesOn();
    const second = await classesOn();

    expect(first.length).toBeGreaterThan(1);

    // No class survives into the next request, so a shared CSS snippet is
    // worthless the moment the page is reloaded.
    expect(first.filter((c) => second.includes(c))).toEqual([]);
  });

  test("survives deleting every element matching any one selector", async ({ page }) => {
    const invite = await publishedInvite("free");
    await page.goto(`/invite/${invite.slug}`);

    const survivors = await page.evaluate((notice) => {
      const marks = Array.from(document.querySelectorAll<HTMLElement>("*")).filter(
        (node) => node.textContent?.trim() === notice
      );

      // Try each mark's own class as the attack selector, and count what is
      // left standing afterwards.
      return marks.map((mark) => {
        const selector = `.${Array.from(mark.classList).join(".")}`;
        const removed = document.querySelectorAll(selector).length;
        return { selector, removed, total: marks.length };
      });
    }, WATERMARK_NOTICE);

    expect(survivors.length).toBeGreaterThan(1);
    for (const attempt of survivors) {
      expect(attempt.removed, `${attempt.selector} matched every mark`).toBeLessThan(attempt.total);
    }
  });
});

test.describe("a paid invitation", () => {
  for (const plan of ["classic", "premium"]) {
    test(`on ${plan} shows no watermark anywhere in the HTML`, async ({ page }) => {
      const invite = await publishedInvite(plan);

      const response = await page.goto(`/invite/${invite.slug}`);
      const html = await response!.text();

      expect(html).not.toContain(WATERMARK_NOTICE);
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
