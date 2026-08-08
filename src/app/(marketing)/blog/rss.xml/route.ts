import { getAllPosts } from "@/lib/content/blog";
import { BRAND, absolute } from "@/lib/seo/jsonld";

/**
 * RSS 2.0 feed for the blog. Static at build time — posts only change when the
 * repo does.
 */

export const dynamic = "force-static";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = await getAllPosts();
  const updated = posts[0]?.frontmatter.publishedAt;

  const items = posts
    .map((post) => {
      const url = absolute(post.href);
      return `    <item>
      <title>${escapeXml(post.frontmatter.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.frontmatter.excerpt)}</description>
      <category>${escapeXml(post.frontmatter.category)}</category>
      <dc:creator>${escapeXml(post.author.name)}</dc:creator>
      <pubDate>${new Date(`${post.frontmatter.publishedAt}T09:00:00+05:30`).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(`${BRAND.name} Blog`)}</title>
    <link>${absolute("/blog")}</link>
    <description>${escapeXml(
      "Guides, traditions and planning notes for Indian weddings and digital invitations."
    )}</description>
    <language>en-in</language>
    <atom:link href="${absolute("/blog/rss.xml")}" rel="self" type="application/rss+xml" />
${updated ? `    <lastBuildDate>${new Date(`${updated}T09:00:00+05:30`).toUTCString()}</lastBuildDate>\n` : ""}${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
