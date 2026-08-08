import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import {
  getAllPages,
  getAllPosts,
  getCategories,
  paginate,
  POSTS_PER_PAGE,
} from "@/lib/content/blog";

/**
 * Marketing, content pages, blog posts and blog listings.
 *
 * Invitations stay out deliberately: they are private links belonging to a
 * family, not public documents. When published invitations become indexable
 * (host opt-in, project-overview.md §10.1), they get added here behind that
 * flag — not before.
 *
 * Tag listings are omitted too. They are thin duplicates of category pages and
 * exist for readers and internal linking, not for search.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, pages, categories] = await Promise.all([
    getAllPosts(),
    getAllPages(),
    getCategories(),
  ]);

  const latestPost = posts[0]?.frontmatter.updatedAt ?? posts[0]?.frontmatter.publishedAt;

  const core: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    {
      url: `${siteUrl}/blog`,
      changeFrequency: "weekly",
      priority: 0.8,
      ...(latestPost ? { lastModified: new Date(latestPost) } : {}),
    },
    { url: `${siteUrl}/signup`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/showcase`, changeFrequency: "weekly", priority: 0.7 },
  ];

  const contentPages: MetadataRoute.Sitemap = pages
    .filter((page) => page.frontmatter.indexable)
    .map((page) => ({
      url: `${siteUrl}${page.href}`,
      lastModified: new Date(page.frontmatter.updatedAt),
      changeFrequency: "monthly" as const,
      priority: page.frontmatter.layout === "legal" ? 0.3 : 0.7,
    }));

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}${post.href}`,
    lastModified: new Date(post.frontmatter.updatedAt ?? post.frontmatter.publishedAt),
    changeFrequency: "monthly" as const,
    priority: post.frontmatter.featured ? 0.8 : 0.7,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${siteUrl}/blog/category/${category.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  // Listing pages 2..n, so deep posts are reachable by a crawler that only
  // follows sitemap URLs.
  const { totalPages } = paginate(posts, 1, POSTS_PER_PAGE);
  const paginationEntries: MetadataRoute.Sitemap = Array.from(
    { length: Math.max(0, totalPages - 1) },
    (_, i) => ({
      url: `${siteUrl}/blog/page/${i + 2}`,
      changeFrequency: "weekly" as const,
      priority: 0.3,
    })
  );

  return [...core, ...contentPages, ...postEntries, ...categoryEntries, ...paginationEntries];
}
