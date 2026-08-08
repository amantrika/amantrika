import type { Metadata } from "next";
import { BlogListing } from "./BlogListing";
import { getAllPosts } from "@/lib/content/blog";
import { JsonLd } from "@/lib/seo/json-ld";
import { blogJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

const TITLE = "The Amantrika blog";
const DESCRIPTION =
  "Guides, traditions and practical planning notes for Indian weddings — and for sending an invitation people actually keep.";

export const metadata: Metadata = pageMetadata({
  title: `${TITLE} · Indian wedding guides and invitation advice`,
  description: DESCRIPTION,
  path: "/blog",
});

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  return (
    <>
      {/* Only page 1 carries the Blog entity — paginated pages would duplicate it. */}
      <JsonLd
        nodes={[
          blogJsonLd(posts),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
          ]),
        ]}
      />
      <BlogListing
        eyebrow="Writing"
        title={TITLE}
        description={DESCRIPTION}
        posts={posts}
        page={1}
        basePath="/blog"
      />
    </>
  );
}
