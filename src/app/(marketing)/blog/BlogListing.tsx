import type { ReactNode } from "react";
import { BlogSidebar } from "./BlogSidebar";
import { Pagination } from "./Pagination";
import { PostCard } from "./PostCard";
import { paginate, POSTS_PER_PAGE, type Post } from "@/lib/content/blog";

/**
 * The two-column listing shell shared by /blog, category listings and tag
 * listings. Every listing paginates identically, so pagination behaviour is
 * defined once here rather than in four routes.
 *
 * Content column first in the DOM, sidebar second — so a phone and a text
 * extractor both get the posts before the navigation furniture.
 */
export function BlogListing({
  title,
  description,
  posts,
  page,
  basePath,
  active,
  eyebrow,
  children,
}: {
  title: string;
  description: string;
  posts: Post[];
  page: number;
  basePath: string;
  active?: { kind: "category" | "tag"; slug: string };
  eyebrow?: string;
  /** Extra content under the heading — breadcrumbs, a taxonomy note. */
  children?: ReactNode;
}) {
  const paged = paginate(posts, page);
  // The wide card only earns its space on the unfiltered first page.
  const showFeatured = page === 1 && basePath === "/blog" && paged.items.length > 2;

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <header className="max-w-2xl">
        {eyebrow && <p className="type-overline text-accent">{eyebrow}</p>}
        <h1 className="mt-2 type-display-lg text-primary">{title}</h1>
        <p className="mt-3 type-body-lg text-muted">{description}</p>
        {children}
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          {paged.items.length === 0 ? (
            <p className="rounded-card border border-dashed border-ornate/50 p-10 text-center type-body text-muted">
              Nothing published here yet.
            </p>
          ) : (
            <div className="grid gap-6">
              {paged.items.map((post, i) => (
                <PostCard
                  key={post.frontmatter.slug}
                  post={post}
                  featured={showFeatured && i === 0}
                />
              ))}
            </div>
          )}

          <Pagination basePath={basePath} page={paged.page} totalPages={paged.totalPages} />

          {paged.total > 0 && (
            <p className="mt-4 text-center type-caption">
              Showing {(paged.page - 1) * POSTS_PER_PAGE + 1}–
              {(paged.page - 1) * POSTS_PER_PAGE + paged.items.length} of {paged.total} posts
            </p>
          )}
        </div>

        <BlogSidebar active={active} />
      </div>
    </div>
  );
}
