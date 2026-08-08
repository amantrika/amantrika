import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  TaxonomyListing,
  taxonomyMetadata,
  taxonomyPageStaticParams,
} from "../../../../taxonomy";

type Params = { params: Promise<{ category: string; page: string }> };

export async function generateStaticParams() {
  return taxonomyPageStaticParams("category");
}

export const dynamicParams = false;

function parsePage(raw: string): number {
  if (!/^\d+$/.test(raw)) notFound();
  return Number(raw);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category, page } = await params;
  return taxonomyMetadata("category", category, parsePage(page));
}

export default async function CategoryPaginatedPage({ params }: Params) {
  const { category, page } = await params;
  const n = parsePage(page);
  if (n <= 1) redirect(`/blog/category/${category}`);

  return <TaxonomyListing kind="category" slug={category} page={n} />;
}
