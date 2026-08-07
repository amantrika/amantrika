import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private invitations and signed-in areas should never be indexed.
      disallow: ["/dashboard", "/agent", "/admin", "/onboarding", "/login", "/signup", "/api", "/auth"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
