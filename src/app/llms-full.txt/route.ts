import { getAllPages, getAllPosts, formatDate } from "@/lib/content/blog";
import { BRAND, absolute } from "@/lib/seo/jsonld";

/**
 * /llms-full.txt — the entire public corpus in one file.
 *
 * `/llms.txt` is the index; this is the whole text, for a model that would
 * rather make one request than twenty. Content pages first, then every blog
 * post newest-first, each with its source URL so a citation points somewhere
 * real.
 */

export const dynamic = "force-static";

export async function GET() {
  const [pages, posts] = await Promise.all([getAllPages(), getAllPosts()]);

  const sections = [
    `# ${BRAND.name} — full text`,
    "",
    `> ${BRAND.description}`,
    "",
    `Generated from the site source. Index: ${absolute("/llms.txt")}`,
    "",
    "---",
    "",
    ...pages.flatMap((page) => [
      `# ${page.frontmatter.title}`,
      "",
      `Source: ${absolute(page.href)} · Updated ${formatDate(page.frontmatter.updatedAt)}`,
      "",
      page.body.trim(),
      "",
      "---",
      "",
    ]),
    ...posts.flatMap((post) => [
      `# ${post.frontmatter.title}`,
      "",
      `Source: ${absolute(post.href)} · ${post.author.name} · ${formatDate(
        post.frontmatter.publishedAt
      )} · ${post.frontmatter.category}`,
      "",
      `> ${post.frontmatter.excerpt}`,
      "",
      post.body.trim(),
      ...(post.frontmatter.faq?.length
        ? [
            "",
            "## Frequently asked questions",
            "",
            ...post.frontmatter.faq.map((item) => `**${item.q}**\n\n${item.a}`),
          ]
        : []),
      "",
      "---",
      "",
    ]),
  ];

  return new Response(sections.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
