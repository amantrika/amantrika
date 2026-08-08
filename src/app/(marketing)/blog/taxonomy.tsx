import { notFound } from "next/navigation";
import Link from "next/link";
import { BlogListing } from "./BlogListing";
import {
  getCategories,
  getPostsByCategory,
  getPostsByTag,
  getTags,
  paginate,
  type Taxonomy,
} from "@/lib/content/blog";
import { JsonLd } from "@/lib/seo/json-ld";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

/**
 * Category and tag listings differ only in their label and their lookup, so
 * both are driven from here. Four routes (two taxonomies × paginated or not)
 * stay thin wrappers.
 */

export type Kind = "category" | "tag";

const copy = {
  category: {
    eyebrow: "Category",
    basePath: (slug: string) => `/blog/category/${slug}`,
    describe: (name: string) => `Everything we have written in ${name}.`,
  },
  tag: {
    eyebrow: "Topic",
    basePath: (slug: string) => `/blog/tag/${slug}`,
    describe: (name: string) => `Posts tagged ${name}.`,
  },
} as const;

async function lookup(kind: Kind, slug: string): Promise<Taxonomy> {
  const all = kind === "category" ? await getCategories() : await getTags();
  const found = all.find((t) => t.slug === slug);
  if (!found) notFound();
  return found;
}

export async function taxonomyStaticParams(kind: Kind) {
  const all = kind === "category" ? await getCategories() : await getTags();
  return all.map((t) => (kind === "category" ? { category: t.slug } : { tag: t.slug }));
}

/** Page-2+ params for every taxonomy value that actually has more than one page. */
export async function taxonomyPageStaticParams(kind: Kind) {
  const all = kind === "category" ? await getCategories() : await getTags();
  const params: Record<string, string>[] = [];

  for (const entry of all) {
    const posts =
      kind === "category" ? await getPostsByCategory(entry.slug) : await getPostsByTag(entry.slug);
    const { totalPages } = paginate(posts, 1);
    for (let p = 2; p <= totalPages; p++) {
      params.push({ [kind]: entry.slug, page: String(p) });
    }
  }
  return params;
}

export async function taxonomyMetadata(kind: Kind, slug: string, page = 1) {
  const entry = await lookup(kind, slug);
  const base = copy[kind].basePath(slug);
  const suffix = page > 1 ? ` · Page ${page}` : "";

  return pageMetadata({
    title:
      kind === "category"
        ? `${entry.name} · Amantrika blog${suffix}`
        : `${entry.name} — wedding invitation guides${suffix}`,
    description: `${copy[kind].describe(entry.name)} ${entry.count} post${
      entry.count === 1 ? "" : "s"
    } from Amantrika on Indian weddings and digital invitations.`,
    path: page > 1 ? `${base}/page/${page}` : base,
    // Tag pages are thin by nature; they exist for readers and internal linking,
    // and we let the posts themselves compete in search instead.
    noIndex: kind === "tag" || page > 1,
  });
}

export async function TaxonomyListing({
  kind,
  slug,
  page = 1,
}: {
  kind: Kind;
  slug: string;
  page?: number;
}) {
  const entry = await lookup(kind, slug);
  const posts =
    kind === "category" ? await getPostsByCategory(slug) : await getPostsByTag(slug);

  const { totalPages } = paginate(posts, page);
  if (page > totalPages && page !== 1) notFound();

  const base = copy[kind].basePath(slug);
  const label = kind === "category" ? "Categories" : "Topics";

  return (
    <>
      <JsonLd
        nodes={[
          collectionPageJsonLd({
            name: `${entry.name} — Amantrika blog`,
            description: copy[kind].describe(entry.name),
            path: base,
            items: posts.map((p) => ({ name: p.frontmatter.title, path: p.href })),
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: entry.name, path: base },
          ]),
        ]}
      />
      <BlogListing
        eyebrow={page > 1 ? `${copy[kind].eyebrow} · page ${page}` : copy[kind].eyebrow}
        title={entry.name}
        description={copy[kind].describe(entry.name)}
        posts={posts}
        page={page}
        basePath={base}
        active={{ kind, slug }}
      >
        <p className="mt-4 type-caption">
          <Link href="/blog" className="text-primary hover:underline">
            ← All posts
          </Link>
          <span aria-hidden> · </span>
          {entry.count} post{entry.count === 1 ? "" : "s"} in {label.toLowerCase()}
        </p>
      </BlogListing>
    </>
  );
}
