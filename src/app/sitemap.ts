import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

/**
 * Only marketing pages. Invitations are personal — they stay out of the sitemap
 * even when published, so they're reachable by link but not by search.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/design-system`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/signup`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
