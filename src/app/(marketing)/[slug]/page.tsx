import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { TableOfContents } from "../blog/[slug]/TableOfContents";
import { FAQ } from "@/lib/content/mdx-components";
import { MdxBody } from "@/lib/content/render";
import { formatDate, getAllPages, getContentPage } from "@/lib/content/blog";
import { JsonLd } from "@/lib/seo/json-ld";
import { breadcrumbJsonLd, faqJsonLd, webPageJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

/**
 * Standalone marketing and legal pages written as MDX in content/pages/.
 *
 * Only slugs that exist as files are generated (`dynamicParams = false`), so
 * this dynamic segment can never shadow a real route or serve a stray URL —
 * anything else 404s at the router.
 */

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const pages = await getAllPages();
  return pages.map((p) => ({ slug: p.frontmatter.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = await getContentPage((await params).slug);
  if (!page) return {};

  return pageMetadata({
    title: page.frontmatter.title,
    description: page.frontmatter.description,
    path: page.href,
    noIndex: !page.frontmatter.indexable,
  });
}

export default async function ContentPageRoute({ params }: Params) {
  const page = await getContentPage((await params).slug);
  if (!page) notFound();

  const { frontmatter: fm } = page;
  const legal = fm.layout === "legal";

  return (
    <>
      <JsonLd
        nodes={[
          webPageJsonLd({
            name: fm.title,
            description: fm.description,
            path: page.href,
            updatedAt: fm.updatedAt,
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: fm.title, path: page.href },
          ]),
          ...(fm.faq?.length ? [faqJsonLd(fm.faq)] : []),
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 py-14">
        <header className="max-w-3xl">
          <h1 className="type-display-lg text-primary">{fm.title}</h1>
          <p className="mt-4 type-body-lg text-muted">{fm.description}</p>
          <p className="mt-4 flex flex-wrap items-center gap-3 type-caption">
            <span>
              {legal ? "In effect from " : "Last updated "}
              <time dateTime={fm.updatedAt}>{formatDate(fm.updatedAt)}</time>
            </span>
            <a
              href={`${page.href}.md`}
              className="inline-flex items-center gap-1 hover:text-primary"
              title="Read this page as plain Markdown"
            >
              <FileText aria-hidden className="size-3.5" />
              Markdown
            </a>
          </p>
        </header>

        <div
          className={
            legal
              ? "mt-10 max-w-3xl"
              : "mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_16rem]"
          }
        >
          <div className="min-w-0 max-w-2xl">
            <MdxBody source={page.body} />
            {fm.faq?.length ? (
              <section className="mt-16">
                <h2 id="frequently-asked-questions" className="type-h2 scroll-mt-28 text-primary">
                  Frequently asked questions
                </h2>
                <FAQ items={fm.faq} />
              </section>
            ) : null}
          </div>

          {!legal && (
            <div className="lg:sticky lg:top-24 lg:self-start">
              <TableOfContents entries={page.toc} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
