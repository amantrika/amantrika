import { expect, test, type Page } from "@playwright/test";
import { getTheme, resolveSectionStyle, themes, type SectionId } from "@/themes";

/**
 * Themes are layouts, not palettes.
 *
 * These tests exist because the failure mode they guard against is invisible in
 * review: a theme can look "applied" — right colours, right fonts — while every
 * theme still renders the identical page. So they assert the structural claim
 * directly, against the theme registry rather than against a snapshot.
 */

const SLUG = "swarnil-weds-prachi";

/**
 * The invitation opens behind a wax seal. Emulating reduced motion is how a
 * guest with that preference sees it, and it skips the seal for us — the same
 * code path, not a test-only bypass.
 */
async function openInvite(page: Page, themeId: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/invite/${SLUG}?theme=${themeId}`);
  await expect(page.locator("section[data-surface]").first()).toBeVisible();
}

/** Section ids in the order they actually appear in the document. */
async function renderedSectionIds(page: Page): Promise<SectionId[]> {
  return page
    .locator("section[data-surface][id]")
    .evaluateAll((nodes) => nodes.map((n) => n.id)) as Promise<SectionId[]>;
}

test.describe("every theme renders its own layout", () => {
  for (const theme of themes) {
    test(`${theme.id} renders its declared section order`, async ({ page }) => {
      await openInvite(page, theme.id);

      const rendered = await renderedSectionIds(page);

      // A section may be skipped for lack of data, but nothing may appear that
      // the theme did not ask for, and nothing may appear out of order.
      expect(rendered.length).toBeGreaterThan(0);
      for (const id of rendered) {
        expect(theme.layout.order).toContain(id);
      }
      const declaredPositions = rendered.map((id) => theme.layout.order.indexOf(id));
      const sorted = [...declaredPositions].sort((a, b) => a - b);
      expect(declaredPositions).toEqual(sorted);
    });

    test(`${theme.id} puts each section on the surface it declared`, async ({ page }) => {
      await openInvite(page, theme.id);

      const rendered = await renderedSectionIds(page);

      for (const id of rendered) {
        const expected = resolveSectionStyle(theme.layout, id).surface;
        await expect(page.locator(`section#${id}[data-surface]`)).toHaveAttribute(
          "data-surface",
          expected
        );
      }
    });
  }
});

test.describe("themes are structurally distinct from one another", () => {
  test("the section sequence differs between themes", async ({ page }) => {
    const sequences = new Map<string, string>();

    for (const id of ["royal-maroon", "ivory-minimal", "haldi-sunshine", "coastal-lagoon"]) {
      await openInvite(page, id);
      sequences.set(id, (await renderedSectionIds(page)).join(","));
    }

    // If this ever collapses to one distinct value, themes have quietly gone
    // back to being colourways.
    expect(new Set(sequences.values()).size).toBe(sequences.size);
  });

  test("a minimal theme renders fewer sections than a maximal one", async ({ page }) => {
    await openInvite(page, "ivory-minimal");
    const minimal = await renderedSectionIds(page);

    await openInvite(page, "banarasi-gold");
    const maximal = await renderedSectionIds(page);

    expect(minimal.length).toBeLessThan(maximal.length);
  });

  test("column width follows the theme, not the page", async ({ page }) => {
    // `events` is measured because neither theme overrides its width, so what
    // is being compared is the themes' own `contentWidth` — narrow vs. wide.
    const widthOfEvents = async (themeId: string) => {
      await openInvite(page, themeId);
      return page.locator("section#events .section-column").evaluate((n) => n.clientWidth);
    };

    expect(await widthOfEvents("banarasi-gold")).toBeGreaterThan(
      await widthOfEvents("ivory-minimal")
    );
  });
});

test.describe("the layout model has no theme-id branches", () => {
  test("an unknown theme id falls back to the default layout", async ({ page }) => {
    await openInvite(page, "not-a-real-theme");

    const rendered = await renderedSectionIds(page);
    const fallback = getTheme("not-a-real-theme");

    for (const id of rendered) {
      expect(fallback.layout.order).toContain(id);
    }
  });
});
