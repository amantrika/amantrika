import type { Metadata } from "next";
import {
  TaxonomyListing,
  taxonomyMetadata,
  taxonomyStaticParams,
} from "../../taxonomy";

type Params = { params: Promise<{ category: string }> };

export async function generateStaticParams() {
  return taxonomyStaticParams("category");
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return taxonomyMetadata("category", (await params).category);
}

export default async function CategoryPage({ params }: Params) {
  return <TaxonomyListing kind="category" slug={(await params).category} />;
}
