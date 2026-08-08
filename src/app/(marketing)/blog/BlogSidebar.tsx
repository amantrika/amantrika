import Link from "next/link";
import { Rss } from "lucide-react";
import { CreateYourOwnWidget, EarnByPromotingWidget } from "./SidebarWidgets";
import { getCategories, getFeaturedPosts, getTags, formatDate } from "@/lib/content/blog";

/**
 * The blog's standing sidebar: taxonomy, featured reading, and one CTA.
 *
 * Server component — everything it shows is known at build time, so it costs
 * zero client JS and every link in it is crawlable.
 *
 * `active` dims the current listing's own entry so the reader can see where
 * they are without a client-side router hook.
 */
export async function BlogSidebar({
  active,
}: {
  active?: { kind: "category" | "tag"; slug: string };
}) {
  const [categories, tags, featured] = await Promise.all([
    getCategories(),
    getTags(),
    getFeaturedPosts(3),
  ]);

  const isActive = (kind: "category" | "tag", slug: string) =>
    active?.kind === kind && active.slug === slug;

  return (
    <aside className="space-y-10 lg:sticky lg:top-24">
      <nav aria-labelledby="sidebar-categories">
        <p id="sidebar-categories" className="type-overline text-primary">
          Categories
        </p>
        <ul className="mt-3 space-y-1">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/blog/category/${category.slug}`}
                aria-current={isActive("category", category.slug) ? "page" : undefined}
                className={`flex items-center justify-between rounded-soft px-3 py-2 type-body transition-colors ${
                  isActive("category", category.slug)
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-foreground/85 hover:bg-accent/8"
                }`}
              >
                {category.name}
                <span className="type-caption">{category.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tags.length > 0 && (
        <nav aria-labelledby="sidebar-tags">
          <p id="sidebar-tags" className="type-overline text-primary">
            Topics
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag.slug}>
                <Link
                  href={`/blog/tag/${tag.slug}`}
                  aria-current={isActive("tag", tag.slug) ? "page" : undefined}
                  className={`inline-block rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive("tag", tag.slug)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-ornate/40 text-muted hover:border-ornate hover:text-primary"
                  }`}
                >
                  {tag.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {featured.length > 0 && (
        <section aria-labelledby="sidebar-featured">
          <p id="sidebar-featured" className="type-overline text-primary">
            Worth reading
          </p>
          <ul className="mt-3 space-y-4">
            {featured.map((post) => (
              <li key={post.frontmatter.slug}>
                <Link href={post.href} className="group block">
                  <p className="type-body font-medium text-foreground group-hover:text-primary">
                    {post.frontmatter.title}
                  </p>
                  <p className="mt-0.5 type-caption">
                    {formatDate(post.frontmatter.publishedAt)} · {post.readingTime} min
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CreateYourOwnWidget />
      <EarnByPromotingWidget />

      <Link
        href="/blog/rss.xml"
        className="inline-flex items-center gap-2 type-caption hover:text-primary"
      >
        <Rss aria-hidden className="size-4" />
        Subscribe by RSS
      </Link>
    </aside>
  );
}
