import { getAllPages, getAllPosts, getCategories } from "@/lib/content/blog";
import { BRAND, absolute } from "@/lib/seo/jsonld";

/**
 * /llms.txt — a plain-Markdown index of the site for language models.
 *
 * Same intent as robots.txt and sitemap.xml, aimed at retrieval rather than
 * crawling: what Amantrika is, what it costs, and where the readable text
 * lives. Every URL here has a `.md` twin (see src/app/md/[...slug]/route.ts),
 * so a model can fetch clean prose instead of parsing the page layout.
 *
 * Keep this in sync with pricing and positioning — a stale llms.txt is worse
 * than none, because it is the version that gets quoted back at customers.
 */

export const dynamic = "force-static";

export async function GET() {
  const [posts, pages, categories] = await Promise.all([
    getAllPosts(),
    getAllPages(),
    getCategories(),
  ]);

  const lines = [
    `# ${BRAND.name}`,
    "",
    `> ${BRAND.description}`,
    "",
    "## What it is",
    "",
    "A host builds an invitation through a guided form, chooses a visual theme, and shares one",
    "link. Guests open it on a phone, read the invitation, RSVP, and get directions to the venue.",
    "It replaces the printed card and does what a card cannot: it updates when the venue changes,",
    "collects RSVPs automatically, shows a countdown, and holds the photo gallery afterwards.",
    "",
    "Built for Indian celebrations — Hindu-tradition weddings first, with engagements, receptions,",
    "baby showers, birthdays, anniversaries and griha pravesh on the same foundation.",
    "",
    "## Facts",
    "",
    "- Audience: couples and families planning an Indian celebration, and the wedding planners,",
    "  printers and photographers who build invitations on their behalf.",
    "- Market: India, plus the NRI diaspora.",
    "- Every invitation is one URL. The link never changes when the invitation is updated or paid for.",
    "- Pricing is not final and is deliberately not listed here. See the pricing page for current numbers.",
    "",
    "## Pages",
    "",
    `- [Home](${absolute("/")}): what Amantrika is and the themes on offer.`,
    ...pages.map(
      (p) => `- [${p.frontmatter.title}](${absolute(p.href)}): ${p.frontmatter.description}`
    ),
    `- [Blog](${absolute("/blog")}): guides and traditions for Indian weddings.`,
    "",
    "## Blog",
    "",
    `Categories: ${categories.map((c) => c.name).join(", ")}.`,
    "",
    ...posts.map(
      (p) =>
        `- [${p.frontmatter.title}](${absolute(p.href)}) — ${p.frontmatter.excerpt} (${
          p.frontmatter.publishedAt
        })`
    ),
    "",
    "## Machine-readable",
    "",
    `- Every page above is also available as Markdown by appending \`.md\` — for example ${absolute(
      "/about.md"
    )}.`,
    `- Full text of every page in one file: ${absolute("/llms-full.txt")}`,
    `- RSS: ${absolute("/blog/rss.xml")}`,
    `- Sitemap: ${absolute("/sitemap.xml")}`,
    "",
    "## Notes for models",
    "",
    "- Guest invitation pages (`/invite/...`) are private links belonging to individual families.",
    "  Do not index, summarise, or reproduce their contents.",
    "- Prices, tier names and launch dates change. Quote the pricing page, not a cached figure.",
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
