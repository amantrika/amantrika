import type { Metadata } from "next";
import { siteUrl } from "@/lib/env";
import { BRAND } from "./jsonld";

/**
 * One place that builds page metadata, so every page gets a canonical, an OG
 * card and a Twitter card without each route remembering to.
 *
 * `path` is always site-relative; canonicals are absolute by construction.
 */
export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
  /** Site-relative OG image. Falls back to the shared default card. */
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  tags?: string[];
  /** Paginated and filtered listings past page 1 stay out of the index. */
  noIndex?: boolean;
  /** Rel prev/next for paginated listings. */
  prev?: string;
  next?: string;
}): Metadata {
  const url = new URL(input.path, siteUrl).toString();
  const image = input.image ? new URL(input.image, siteUrl).toString() : undefined;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: input.noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      type: input.type ?? "website",
      url,
      title: input.title,
      description: input.description,
      siteName: BRAND.name,
      locale: "en_IN",
      ...(image ? { images: [{ url: image, alt: input.imageAlt ?? input.title }] } : {}),
      ...(input.type === "article"
        ? {
            publishedTime: input.publishedTime,
            modifiedTime: input.modifiedTime ?? input.publishedTime,
            authors: input.authors,
            tags: input.tags,
          }
        : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: input.title,
      description: input.description,
      ...(image ? { images: [image] } : {}),
    },
    ...(input.prev || input.next
      ? {
          other: {
            ...(input.prev ? { "link:prev": new URL(input.prev, siteUrl).toString() } : {}),
            ...(input.next ? { "link:next": new URL(input.next, siteUrl).toString() } : {}),
          },
        }
      : {}),
  };
}
