import type { Metadata } from "next";
import { TaxonomyListing, taxonomyMetadata, taxonomyStaticParams } from "../../taxonomy";

type Params = { params: Promise<{ tag: string }> };

export async function generateStaticParams() {
  return taxonomyStaticParams("tag");
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return taxonomyMetadata("tag", (await params).tag);
}

export default async function TagPage({ params }: Params) {
  return <TaxonomyListing kind="tag" slug={(await params).tag} />;
}
