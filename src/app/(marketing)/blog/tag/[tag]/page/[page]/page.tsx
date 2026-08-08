import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  TaxonomyListing,
  taxonomyMetadata,
  taxonomyPageStaticParams,
} from "../../../../taxonomy";

type Params = { params: Promise<{ tag: string; page: string }> };

export async function generateStaticParams() {
  return taxonomyPageStaticParams("tag");
}

export const dynamicParams = false;

function parsePage(raw: string): number {
  if (!/^\d+$/.test(raw)) notFound();
  return Number(raw);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tag, page } = await params;
  return taxonomyMetadata("tag", tag, parsePage(page));
}

export default async function TagPaginatedPage({ params }: Params) {
  const { tag, page } = await params;
  const n = parsePage(page);
  if (n <= 1) redirect(`/blog/tag/${tag}`);

  return <TaxonomyListing kind="tag" slug={tag} page={n} />;
}
