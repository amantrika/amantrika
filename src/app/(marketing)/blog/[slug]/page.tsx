import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, FileText } from "lucide-react";
import { Badge } from "@/design-system/components/bits";
import { TableOfContents } from "./TableOfContents";
import { PostCard } from "../PostCard";
import { CTA, FAQ } from "@/lib/content/mdx-components";
import { MdxBody, splitAtSecondSection } from "@/lib/content/render";
import {
  categorySlug,
  formatDate,
  getAllPosts,
  getPost,
  getPostNeighbours,
  getRelatedPosts,
  tagSlug,
} from "@/lib/content/blog";
import { JsonLd } from "@/lib/seo/json-ld";
import { blogPostingJsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

type Params = { params: Promise<{ slug: string }> };

/** Every post is prerendered; an unknown slug is a 404, never a runtime read. */
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((p) => ({ slug: p.frontmatter.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return {};
  const { frontmatter: fm } = post;

  return pageMetadata({
    title: fm.seoTitle ?? fm.title,
    description: fm.excerpt,
    path: post.href,
    type: "article",
    image: fm.coverImage,
    imageAlt: fm.coverAlt,
    publishedTime: fm.publishedAt,
    modifiedTime: fm.updatedAt ?? fm.publishedAt,
    authors: [post.author.name],
    tags: fm.tags,
  });
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const { frontmatter: fm } = post;
  const [related, { previous, next }] = await Promise.all([
    getRelatedPosts(post),
    getPostNeighbours(slug),
  ]);

  // The mid-article CTA is injected by the platform, not by the writer, so
  // every post has at least two routes to signup without anyone remembering.
  const [head, tail] = splitAtSecondSection(post.body);

  return (
    <>
      <JsonLd
        nodes={[
          blogPostingJsonLd(post),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: fm.category, path: `/blog/category/${categorySlug(fm.category)}` },
            { name: fm.title, path: post.href },
          ]),
          // Same answers the reader sees in the accordion below.
          ...(fm.faq?.length ? [faqJsonLd(fm.faq)] : []),
        ]}
      />

      <article className="mx-auto max-w-6xl px-4 py-14">
        <nav aria-label="Breadcrumb" className="type-caption">
          <Link href="/blog" className="hover:text-primary">
            Blog
          </Link>
          <span aria-hidden> / </span>
          <Link
            href={`/blog/category/${categorySlug(fm.category)}`}
            className="hover:text-primary"
          >
            {fm.category}
          </Link>
        </nav>

        <header className="mt-4 max-w-3xl">
          <h1 className="type-display-lg text-primary">{fm.title}</h1>
          <p className="mt-4 type-body-lg text-muted">{fm.excerpt}</p>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 type-caption">
            <span className="font-medium text-foreground">{post.author.name}</span>
            <span aria-hidden>·</span>
            <time dateTime={fm.publishedAt}>{formatDate(fm.publishedAt)}</time>
            {fm.updatedAt && fm.updatedAt !== fm.publishedAt && (
              <>
                <span aria-hidden>·</span>
                <span>Updated {formatDate(fm.updatedAt)}</span>
              </>
            )}
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden className="size-3.5" />
              {post.readingTime} min read
            </span>
            {/* The plain-text twin, offered openly — see /llms.txt. */}
            <a
              href={`${post.href}.md`}
              className="inline-flex items-center gap-1 hover:text-primary"
              title="Read this post as plain Markdown"
            >
              <FileText aria-hidden className="size-3.5" />
              Markdown
            </a>
          </div>
        </header>

        {fm.coverImage && (
          <figure className="mt-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fm.coverImage}
              alt={fm.coverAlt ?? ""}
              className="max-h-[26rem] w-full rounded-card border border-ornate/30 object-cover"
            />
          </figure>
        )}

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_16rem]">
          {/* Prose first in the DOM so extractors reach the article before the nav. */}
          <div className="min-w-0 max-w-2xl">
            <MdxBody source={head} />
            {tail && (
              <>
                <CTA />
                <MdxBody source={tail} />
              </>
            )}

            {fm.faq?.length ? (
              <section className="mt-16">
                <h2 className="type-h2 scroll-mt-28 text-primary" id="frequently-asked-questions">
                  Frequently asked questions
                </h2>
                <FAQ items={fm.faq} />
              </section>
            ) : null}

            <CTA
              title="Ready to send yours?"
              body="Every theme in this post is live in the builder. Start free and only pay when you publish."
            />

            <footer className="mt-12 border-t border-ornate/30 pt-8">
              <ul className="flex flex-wrap gap-2">
                {fm.tags.map((tag) => (
                  <li key={tag}>
                    <Link
                      href={`/blog/tag/${tagSlug(tag)}`}
                      className="inline-block rounded-full border border-ornate/40 px-3 py-1 text-xs font-medium text-muted hover:border-ornate hover:text-primary"
                    >
                      {tag}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-8 rounded-card border border-ornate/30 bg-surface p-6">
                <p className="type-overline text-primary">Written by</p>
                <p className="mt-1 type-h3 text-foreground">{post.author.name}</p>
                <p className="type-caption">{post.author.role}</p>
                <p className="mt-2 type-body text-muted">{post.author.bio}</p>
              </div>

              <nav
                aria-label="More posts"
                className="mt-8 grid gap-4 border-t border-ornate/20 pt-8 sm:grid-cols-2"
              >
                {previous ? (
                  <Link href={previous.href} className="group rounded-card p-4 hover:bg-accent/8">
                    <span className="inline-flex items-center gap-1 type-caption">
                      <ArrowLeft aria-hidden className="size-3.5" /> Previous
                    </span>
                    <p className="mt-1 type-body font-medium text-foreground group-hover:text-primary">
                      {previous.frontmatter.title}
                    </p>
                  </Link>
                ) : (
                  <span />
                )}
                {next && (
                  <Link
                    href={next.href}
                    className="group rounded-card p-4 text-right hover:bg-accent/8"
                  >
                    <span className="inline-flex items-center gap-1 type-caption">
                      Next <ArrowRight aria-hidden className="size-3.5" />
                    </span>
                    <p className="mt-1 type-body font-medium text-foreground group-hover:text-primary">
                      {next.frontmatter.title}
                    </p>
                  </Link>
                )}
              </nav>
            </footer>
          </div>

          <div className="space-y-8 lg:sticky lg:top-24 lg:self-start">
            <TableOfContents entries={post.toc} />
            <div>
              <p className="type-overline text-primary">Filed under</p>
              <div className="mt-2">
                <Badge tone="accent">{fm.category}</Badge>
              </div>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-20 border-t border-ornate/30 pt-12">
            <h2 id="related-heading" className="type-h2 text-primary">
              Keep reading
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {related.map((p) => (
                <PostCard key={p.frontmatter.slug} post={p} />
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
