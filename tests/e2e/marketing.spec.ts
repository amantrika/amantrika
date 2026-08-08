import { expect, test } from "@playwright/test";

/**
 * The SEO and LLM rules in CLAUDE.md §3–4 are stated as absolutes, so they are
 * testable as absolutes. Search is the cheapest acquisition channel this
 * product has; a silent regression here is expensive and invisible.
 */

const PUBLIC_PAGES = ["/", "/about", "/how-it-works", "/contact", "/blog"];

test.describe("every marketing page", () => {
  for (const path of PUBLIC_PAGES) {
    test.describe(path, () => {
      test("has exactly one h1", async ({ page }) => {
        await page.goto(path);
        await expect(page.locator("h1")).toHaveCount(1);
      });

      test("has a title within 60 characters", async ({ page }) => {
        await page.goto(path);
        const title = await page.title();

        expect(title.length).toBeGreaterThan(0);
        expect(title.length).toBeLessThanOrEqual(60);
      });

      test("has a description within 155 characters", async ({ page }) => {
        await page.goto(path);
        const description = await page
          .locator('meta[name="description"]')
          .getAttribute("content");

        expect(description).toBeTruthy();
        expect(description!.length).toBeLessThanOrEqual(155);
      });

      test("declares a canonical URL", async ({ page }) => {
        await page.goto(path);
        await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      });

      test("carries Open Graph tags", async ({ page }) => {
        await page.goto(path);
        await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
        await expect(page.locator('meta[property="og:description"]')).toHaveCount(1);
      });

      test("emits JSON-LD that parses", async ({ page }) => {
        await page.goto(path);
        const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();

        expect(blocks.length).toBeGreaterThan(0);
        for (const block of blocks) {
          const parsed = JSON.parse(block);
          expect(parsed["@context"]).toContain("schema.org");
          expect(parsed["@type"] ?? parsed["@graph"]).toBeTruthy();
        }
      });

      test("emits no block element inside a paragraph", async ({ page }) => {
        // A <p> holds phrasing content only. Put a <p>, a <div> or a list
        // inside one and the browser closes the paragraph early — a repair
        // that happens in the DOM and not in the string the server sent, so
        // the two disagree and React refuses to hydrate. The page then looks
        // finished and is inert.
        //
        // This is easy to reintroduce from MDX, which wraps any text between
        // blank lines in a paragraph of its own: a block component that also
        // renders a <p> nests them without anyone writing nested tags.
        // `MissionStatement` on /about did exactly that.
        const response = await page.goto(path);
        const html = (await response!.text()).toLowerCase();

        // Compare what the parser built against the string it was built from.
        // Any repair shows up as a difference the browser made and the server
        // did not.
        const offenders = await page.evaluate(() =>
          [...document.querySelectorAll("p")]
            .filter((p) =>
              p.querySelector("p, div, ul, ol, dl, table, figure, section, h1, h2, h3")
            )
            .map((p) => p.outerHTML.slice(0, 120))
        );

        expect(offenders).toEqual([]);
        // The server string must be clean too — the DOM check above cannot see
        // a paragraph the parser already closed and discarded.
        expect(html).not.toMatch(/<p\b[^>]*>(?:(?!<\/p>)[\s\S]){0,400}?<p\b/);
      });

      test("serves its content in the HTML, not only after hydration", async ({ page }) => {
        // A retriever that does not run JavaScript must still see the page.
        const response = await page.goto(path);
        const html = (await response!.text()).toLowerCase();

        expect(html).toContain("<h1");
        expect(html.length).toBeGreaterThan(1000);
      });
    });
  }
});

test.describe("crawler and model access", () => {
  test("robots.txt keeps private surfaces out of the index", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);

    const body = await response.text();
    for (const path of ["/dashboard", "/admin", "/api", "/checkout", "/onboarding"]) {
      expect(body).toContain(path);
    }
  });

  test("robots.txt does not block model crawlers", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();

    // A blanket disallow aimed at these agents would cut off the channel §4 is
    // written to serve.
    for (const agent of ["GPTBot", "ClaudeBot", "PerplexityBot"]) {
      const blocked = new RegExp(`User-agent:\\s*${agent}[\\s\\S]*?Disallow:\\s*/\\s*$`, "im");
      expect(body).not.toMatch(blocked);
    }
  });

  test("sitemap.xml lists URLs", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("<loc>");
  });

  test("llms.txt describes the product in plain Markdown", async ({ request }) => {
    const response = await request.get("/llms.txt");
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain("Amantrika");
    expect(body.length).toBeGreaterThan(200);
  });

  test("blog posts have a markdown twin", async ({ request }) => {
    const response = await request.get("/md/blog/how-to-word-a-wedding-invitation");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("markdown");
    expect((await response.text()).length).toBeGreaterThan(200);
  });

  test("the RSS feed is served", async ({ request }) => {
    const response = await request.get("/blog/rss.xml");
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("<rss");
  });
});

test.describe("images", () => {
  test("every image on the home page has alt text", async ({ page }) => {
    await page.goto("/");

    const missing = await page
      .locator("img:not([alt])")
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLImageElement).src));

    expect(missing).toEqual([]);
  });
});
