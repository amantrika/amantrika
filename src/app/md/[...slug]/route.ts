import { getAllPages, getAllPosts, getContentPage, getPost, formatDate } from "@/lib/content/blog";
import { toPlainMarkdown } from "@/lib/content/plain-markdown";
import { absolute } from "@/lib/seo/jsonld";

/**
 * Markdown twins of every public page.
 *
 * `/blog/how-to-word-a-wedding-invitation.md` and `/about.md` return the same
 * content as the HTML page, as `text/markdown`. Middleware rewrites the `.md`
 * URL onto this route, so the twin is a real, linkable URL rather than an API
 * call — see src/middleware.ts.
 *
 * Why this exists: models retrieving a page get clean prose instead of parsing
 * a layout out of the DOM, and the answer they extract is the answer we wrote.
 * Statically generated at build time, so there is no runtime filesystem read.
 */

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const [posts, pages] = await Promise.all([getAllPosts(), getAllPages()]);
  return [
    ...posts.map((p) => ({ slug: ["blog", p.frontmatter.slug] })),
    ...pages.map((p) => ({ slug: [p.frontmatter.slug] })),
  ];
}

function markdownResponse(body: string) {
  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-robots-tag": "noindex", // the HTML page is the canonical one to index
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const segments = (await params).slug;

  if (segments[0] === "blog" && segments.length === 2) {
    const post = await getPost(segments[1]);
    if (!post) return new Response("Not found", { status: 404 });
    const { frontmatter: fm } = post;

    const header = [
      `# ${fm.title}`,
      "",
      `> ${fm.excerpt}`,
      "",
      `- Source: ${absolute(post.href)}`,
      `- Author: ${post.author.name}, ${post.author.role}`,
      `- Published: ${formatDate(fm.publishedAt)}${
        fm.updatedAt && fm.updatedAt !== fm.publishedAt
          ? ` (updated ${formatDate(fm.updatedAt)})`
          : ""
      }`,
      `- Category: ${fm.category}`,
      `- Tags: ${fm.tags.join(", ")}`,
      `- Reading time: ${post.readingTime} min`,
      "",
      "---",
      "",
    ].join("\n");

    const faq = fm.faq?.length
      ? "\n\n## Frequently asked questions\n\n" +
        fm.faq.map((item) => `### ${item.q}\n\n${item.a}`).join("\n\n")
      : "";

    return markdownResponse(`${header}${toPlainMarkdown(post.body)}${faq}\n`);
  }

  if (segments.length === 1) {
    const page = await getContentPage(segments[0]);
    if (!page) return new Response("Not found", { status: 404 });
    const { frontmatter: fm } = page;

    const header = [
      `# ${fm.title}`,
      "",
      `> ${fm.description}`,
      "",
      `- Source: ${absolute(page.href)}`,
      `- Last updated: ${formatDate(fm.updatedAt)}`,
      "",
      "---",
      "",
    ].join("\n");

    const faq = fm.faq?.length
      ? "\n\n## Frequently asked questions\n\n" +
        fm.faq.map((item) => `### ${item.q}\n\n${item.a}`).join("\n\n")
      : "";

    return markdownResponse(`${header}${toPlainMarkdown(page.body)}${faq}\n`);
  }

  return new Response("Not found", { status: 404 });
}
