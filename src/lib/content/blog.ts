import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";
import { getAuthor, type Author } from "../../../content/authors";
import {
  categories,
  pageFrontmatterSchema,
  postFrontmatterSchema,
  type Category,
  type PageFrontmatter,
  type PostFrontmatter,
} from "./schema";

/**
 * The content layer. Reads MDX off disk, validates frontmatter, and hands
 * routes plain data.
 *
 * Everything here runs at build time on the server. There is no CMS and no
 * database call — posts are versioned with the code, which is the whole reason
 * the blog is MDX (project-overview.md §2.10).
 */

const BLOG_DIR = path.join(process.cwd(), "content", "blog");
const PAGES_DIR = path.join(process.cwd(), "content", "pages");

/** Posts per page on /blog and on every category and tag listing. */
export const POSTS_PER_PAGE = 4;

export interface TocEntry {
  depth: 2 | 3;
  text: string;
  id: string;
}

export interface Post {
  frontmatter: PostFrontmatter;
  author: Author;
  /** Raw MDX body, frontmatter stripped. Rendered by the route. */
  body: string;
  readingTime: number;
  toc: TocEntry[];
  href: string;
}

export interface ContentPage {
  frontmatter: PageFrontmatter;
  body: string;
  toc: TocEntry[];
  href: string;
}

/* ------------------------------------------------------------------ parsing */

/** ~200 wpm, rounded up, never zero. Computed — never hand-written in frontmatter. */
function readingTimeOf(body: string): number {
  const words = body
    .replace(/```[\s\S]*?```/g, "") // code blocks aren't read at prose speed
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Pulls H2/H3 out of the raw MDX for the sidebar table of contents.
 *
 * Slugs are generated with the same github-slugger that rehype-slug uses, so
 * the anchors here always match the ids rehype puts on the rendered headings.
 * Fenced code is stripped first so a `# comment` inside a snippet is not
 * mistaken for a heading.
 */
function tableOfContents(body: string): TocEntry[] {
  const slugger = new GithubSlugger();
  const withoutCode = body.replace(/```[\s\S]*?```/g, "");
  const entries: TocEntry[] = [];

  for (const line of withoutCode.split("\n")) {
    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const text = match[2]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → their text
      .replace(/[*_`]/g, "")
      .trim();
    entries.push({ depth: match[1].length === 2 ? 2 : 3, text, id: slugger.slug(text) });
  }
  return entries;
}

async function listMdx(dir: string): Promise<string[]> {
  try {
    const files = await readdir(dir);
    return files.filter((f) => f.endsWith(".mdx")).sort();
  } catch {
    return []; // directory not created yet — an empty blog is not a build error
  }
}

/* -------------------------------------------------------------------- posts */

async function readPost(file: string): Promise<Post> {
  const filename = path.basename(file, ".mdx");
  const raw = await readFile(path.join(BLOG_DIR, file), "utf8");
  const { data, content } = matter(raw);

  const parsed = postFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Invalid frontmatter in content/blog/${file}:\n` +
        parsed.error.issues.map((i) => `  · ${i.path.join(".")}: ${i.message}`).join("\n")
    );
  }
  // The filename is the URL, so it is the authority. Declaring `slug` is
  // optional — Keystatic writes the slug as the filename and no frontmatter key
  // — but declaring it *differently* is a mistake worth stopping the build for.
  if (parsed.data.slug && parsed.data.slug !== filename) {
    throw new Error(
      `content/blog/${file}: slug "${parsed.data.slug}" must match the filename "${filename}". ` +
        `The filename is what the URL is built from.`
    );
  }
  const frontmatter = { ...parsed.data, slug: filename };

  return {
    frontmatter,
    author: getAuthor(frontmatter.author),
    body: content,
    readingTime: readingTimeOf(content),
    toc: tableOfContents(content),
    href: `/blog/${frontmatter.slug}`,
  };
}

/**
 * Every publishable post, newest first. Drafts are included only outside
 * production, so you can preview one on a local run without publishing it.
 */
export const getAllPosts = cache(async (): Promise<Post[]> => {
  const files = await listMdx(BLOG_DIR);
  const posts = await Promise.all(files.map(readPost));

  return posts
    .filter((p) => !p.frontmatter.draft || process.env.NODE_ENV !== "production")
    .sort((a, b) => b.frontmatter.publishedAt.localeCompare(a.frontmatter.publishedAt));
});

export const getPost = cache(async (slug: string): Promise<Post | null> => {
  const posts = await getAllPosts();
  return posts.find((p) => p.frontmatter.slug === slug) ?? null;
});

export async function getFeaturedPosts(limit = 3): Promise<Post[]> {
  const posts = await getAllPosts();
  const featured = posts.filter((p) => p.frontmatter.featured);
  return (featured.length ? featured : posts).slice(0, limit);
}

/**
 * Related posts by tag overlap, then category, then recency. Deliberately
 * simple: with a few dozen posts, anything cleverer is unverifiable.
 */
export async function getRelatedPosts(post: Post, limit = 3): Promise<Post[]> {
  const posts = await getAllPosts();
  const tags = new Set(post.frontmatter.tags);

  return posts
    .filter((p) => p.frontmatter.slug !== post.frontmatter.slug)
    .map((p) => ({
      post: p,
      score:
        p.frontmatter.tags.filter((t) => tags.has(t)).length * 2 +
        (p.frontmatter.category === post.frontmatter.category ? 1 : 0),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.post.frontmatter.publishedAt.localeCompare(a.post.frontmatter.publishedAt)
    )
    .slice(0, limit)
    .map((r) => r.post);
}

/** Previous/next in publication order — older is "previous". */
export async function getPostNeighbours(
  slug: string
): Promise<{ previous: Post | null; next: Post | null }> {
  const posts = await getAllPosts();
  const i = posts.findIndex((p) => p.frontmatter.slug === slug);
  if (i === -1) return { previous: null, next: null };
  return { previous: posts[i + 1] ?? null, next: posts[i - 1] ?? null };
}

/* ------------------------------------------------------- taxonomy + paging */

export interface Taxonomy {
  name: string;
  slug: string;
  count: number;
}

export function categorySlug(category: Category | string): string {
  return category.toLowerCase().replace(/\s+/g, "-");
}

export function tagSlug(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Only categories that actually have posts — no empty listing pages. */
export const getCategories = cache(async (): Promise<Taxonomy[]> => {
  const posts = await getAllPosts();
  return categories
    .map((name) => ({
      name,
      slug: categorySlug(name),
      count: posts.filter((p) => p.frontmatter.category === name).length,
    }))
    .filter((c) => c.count > 0);
});

export const getTags = cache(async (): Promise<Taxonomy[]> => {
  const posts = await getAllPosts();
  const counts = new Map<string, Taxonomy>();

  for (const post of posts) {
    for (const tag of post.frontmatter.tags) {
      const slug = tagSlug(tag);
      const existing = counts.get(slug);
      if (existing) existing.count += 1;
      else counts.set(slug, { name: tag, slug, count: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
});

export async function getPostsByCategory(slug: string): Promise<Post[]> {
  const posts = await getAllPosts();
  return posts.filter((p) => categorySlug(p.frontmatter.category) === slug);
}

export async function getPostsByTag(slug: string): Promise<Post[]> {
  const posts = await getAllPosts();
  return posts.filter((p) => p.frontmatter.tags.some((t) => tagSlug(t) === slug));
}

export interface Page<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/** Page numbers are 1-based because they are user-visible URLs. */
export function paginate<T>(items: T[], page: number, perPage = POSTS_PER_PAGE): Page<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), totalPages);

  return {
    items: items.slice((current - 1) * perPage, current * perPage),
    page: current,
    totalPages,
    total,
    hasPrevious: current > 1,
    hasNext: current < totalPages,
  };
}

/* -------------------------------------------------------------------- pages */

export const getAllPages = cache(async (): Promise<ContentPage[]> => {
  const files = await listMdx(PAGES_DIR);

  return Promise.all(
    files.map(async (file) => {
      const filename = path.basename(file, ".mdx");
      const raw = await readFile(path.join(PAGES_DIR, file), "utf8");
      const { data, content } = matter(raw);

      const parsed = pageFrontmatterSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error(
          `Invalid frontmatter in content/pages/${file}:\n` +
            parsed.error.issues.map((i) => `  · ${i.path.join(".")}: ${i.message}`).join("\n")
        );
      }
      if (parsed.data.slug && parsed.data.slug !== filename) {
        throw new Error(
          `content/pages/${file}: slug "${parsed.data.slug}" must match the filename.`
        );
      }
      const frontmatter = { ...parsed.data, slug: filename };

      return {
        frontmatter,
        body: content,
        toc: tableOfContents(content),
        href: `/${frontmatter.slug}`,
      };
    })
  );
});

export const getContentPage = cache(async (slug: string): Promise<ContentPage | null> => {
  const pages = await getAllPages();
  return pages.find((p) => p.frontmatter.slug === slug) ?? null;
});

/* ------------------------------------------------------------------ helpers */

/** "14 March 2025" — one date format across the whole site. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}
