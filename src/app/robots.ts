import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

/**
 * Signed-in areas and private invitations are disallowed for everyone.
 *
 * Model crawlers are not blocked on the public pages: being quotable by an
 * assistant is a discovery channel, and everything public here is content we
 * wrote to be read. Guest invitations are excluded for all agents alike —
 * those belong to families, not to the index.
 */

const PRIVATE = [
  "/dashboard",
  "/agent",
  "/admin",
  "/onboarding",
  "/login",
  "/signup",
  "/api",
  "/auth",
  "/invite", // guest invitations — private links, never indexed
  "/checkout",
  "/md/", // markdown twins; the HTML page is the canonical one
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
