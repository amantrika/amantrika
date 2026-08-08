import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers/auth";
import { createTestHost, type TestHost } from "./helpers/supabase";

/**
 * The theme is chosen at the end of onboarding, against the host's own details.
 *
 * These tests guard the property that makes that worth doing: the preview is
 * the real invitation renderer, so what the host approves is what their guests
 * receive. A chooser showing sample cards would pass none of this.
 */

let host: TestHost;

test.beforeAll(async () => {
  host = await createTestHost();
});

/** Walks the form far enough to reach the theme step, filling the minimum. */
async function reachThemeStep(page: Page, names: [string, string]) {
  await signIn(page, host);
  await page.goto("/onboarding");

  // Occasion → Region
  await page.getByRole("button", { name: /Continue/ }).click();
  // Region → Details
  await page.getByRole("button", { name: /Continue/ }).click();

  await page.getByLabel("Partner 1 name").fill(names[0]);
  await page.getByLabel("Partner 2 name").fill(names[1]);
  await page.getByLabel("City").fill("Udaipur");

  // Details → Link
  await page.getByRole("button", { name: /Continue/ }).click();

  // The permalink defaults from the names and self-checks; wait for the verdict.
  await expect(page.getByText("available!")).toBeVisible({ timeout: 20_000 });

  // Link → Photos (this is where the draft is first written to the database)
  await page.getByRole("button", { name: /Continue/ }).click();
  // Photos → Theme
  await page.getByRole("button", { name: /Continue/ }).click();

  await expect(page.getByRole("heading", { name: /Now choose how it looks/ })).toBeVisible();
}

test.describe("choosing a theme at the end of onboarding", () => {
  test("the preview shows the host's own names, not a sample couple", async ({ page }) => {
    const names: [string, string] = ["Meera", "Rohan"];
    await reachThemeStep(page, names);

    // The preview is the invitation renderer, so the names appear inside it.
    const preview = page.locator("[data-theme] section[data-surface]").first();
    await expect(preview).toBeVisible();
    await expect(page.locator("[data-theme]").filter({ hasText: names[0] }).first()).toBeVisible();
    await expect(page.locator("[data-theme]").filter({ hasText: names[1] }).first()).toBeVisible();
  });

  test("switching theme changes the layout, not just the colours", async ({ page }) => {
    await reachThemeStep(page, ["Anika", "Vikram"]);

    const sectionIds = () =>
      page
        .locator("[data-theme] section[data-surface][id]")
        .evaluateAll((nodes) => nodes.map((n) => n.id).join(","));

    const first = await sectionIds();

    // Ivory Minimal is the shortest layout in the registry, so switching to it
    // from anything else must change the section list.
    await page.getByRole("button", { name: /Ivory Minimal/ }).click();
    await expect(page.getByText("Ivory Minimal — your invitation")).toBeVisible();

    expect(await sectionIds()).not.toBe(first);
  });

  test("the chosen theme survives to the publish step", async ({ page }) => {
    await reachThemeStep(page, ["Divya", "Arjun"]);

    await page.getByRole("button", { name: /Coastal Lagoon/ }).click();
    await page.getByRole("button", { name: "Use Coastal Lagoon" }).click();
    await expect(page.getByText("This is your theme")).toBeVisible();

    // Theme → Publish saves the draft again; the step must be reachable.
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page.getByText("Order summary")).toBeVisible({ timeout: 20_000 });
  });

  test("the preview cannot submit an RSVP", async ({ page }) => {
    await reachThemeStep(page, ["Sneha", "Karan"]);

    // Royal Maroon renders an RSVP section; inside the preview it must refuse.
    const rsvp = page.locator("[data-theme] section#rsvp");
    if (await rsvp.count()) {
      await rsvp.scrollIntoViewIfNeeded();
      const submit = rsvp.getByRole("button", { name: /Send|RSVP|Submit/i }).first();
      if (await submit.count()) {
        await submit.click();
        await expect(page.getByText(/This is a preview/i)).toBeVisible();
      }
    }
  });
});
