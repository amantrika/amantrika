import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BlogListing } from "../../BlogListing";
import { getAllPosts, paginate } from "@/lib/content/blog";
import { JsonLd } from "@/lib/seo/json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

/**
 * /blog/page/2 and beyond. Page 1 lives at /blog and is redirected here, so
 * there is exactly one URL per page of results and no duplicate-content split.
 */

type Params = { params: Promise<{ page: string }> };

/** Only real pages are prerendered; page/99 on a 3-page blog is a 404, not an empty list. */
export async function generateStaticParams() {
  const posts = await getAllPosts();
  const { totalPages } = paginate(posts, 1);
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({
    page: String(i + 2),
  }));
}

export const dynamicParams = false;

function parsePage(raw: string): number {
  if (!/^\d+$/.test(raw)) notFound();
  return Number(raw);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = parsePage((await params).page);

  return pageMetadata({
    title: `The Amantrika blog · Page ${page}`,
    description:
      "Guides, traditions and practical planning notes for Indian weddings and digital invitations.",
    path: `/blog/page/${page}`,
    // Deeper listing pages are crawlable and followable but not worth indexing —
    // the posts themselves are the pages we want ranking.
    noIndex: true,
    prev: page === 2 ? "/blog" : `/blog/page/${page - 1}`,
  });
}

export default async function BlogPaginatedPage({ params }: Params) {
  const page = parsePage((await params).page);
  if (page <= 1) redirect("/blog");

  const posts = await getAllPosts();
  const { totalPages } = paginate(posts, page);
  if (page > totalPages) notFound();

  return (
    <>
      <JsonLd
        nodes={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: `Page ${page}`, path: `/blog/page/${page}` },
          ]),
        ]}
      />
      <BlogListing
        eyebrow={`Page ${page} of ${totalPages}`}
        title="The Amantrika blog"
        description="Guides, traditions and practical planning notes for Indian weddings."
        posts={posts}
        page={page}
        basePath="/blog"
      />
    </>
  );
}
