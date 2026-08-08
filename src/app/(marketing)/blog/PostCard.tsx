import Link from "next/link";
import { Clock } from "lucide-react";
import { Badge } from "@/design-system/components/bits";
import { categorySlug, formatDate, type Post } from "@/lib/content/blog";

/**
 * Post teaser. `featured` renders the wide first card on the blog index;
 * everything else is the compact list card.
 */
export function PostCard({ post, featured = false }: { post: Post; featured?: boolean }) {
  const { frontmatter: fm } = post;

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-card border border-ornate/30 bg-surface transition-shadow hover:shadow-resting ${
        featured ? "sm:flex-row" : ""
      }`}
    >
      {fm.coverImage && (
        <div className={featured ? "sm:w-2/5 sm:shrink-0" : ""}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fm.coverImage}
            alt={fm.coverAlt ?? ""}
            loading={featured ? "eager" : "lazy"}
            className="h-44 w-full object-cover sm:h-full"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{fm.category}</Badge>
          <span className="type-caption">{formatDate(fm.publishedAt)}</span>
        </div>

        <h3 className={`mt-3 text-primary ${featured ? "type-h2" : "type-h3"}`}>
          {/* Whole card is the link target — the ::after stretches over it. */}
          <Link
            href={post.href}
            className="after:absolute after:inset-0 after:content-[''] hover:underline decoration-accent/60 underline-offset-4"
          >
            {fm.title}
          </Link>
        </h3>

        <p className="mt-2 type-body text-muted">{fm.excerpt}</p>

        <div className="mt-4 flex items-center gap-3 pt-2 type-caption">
          <span>{post.author.name}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden className="size-3.5" />
            {post.readingTime} min read
          </span>
          {/* Relative link inside a stretched-link card needs its own stacking context. */}
          <Link
            href={`/blog/category/${categorySlug(fm.category)}`}
            className="relative z-10 ml-auto hidden text-primary hover:underline sm:inline"
          >
            More in {fm.category}
          </Link>
        </div>
      </div>
    </article>
  );
}
