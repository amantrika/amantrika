import type { ReactNode } from "react";
import { JsonLd } from "@/lib/seo/json-ld";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { getProfile, homeFor } from "@/lib/auth";

/**
 * Shell for every public, indexable page: blog, content pages, showcase, legal.
 *
 * Header and footer come from the shared site chrome so the landing page and
 * this section can't drift apart. Organization and WebSite JSON-LD are emitted
 * once here rather than per page, so every marketing URL carries the same
 * publisher identity and page-level builders can reference it by @id.
 */
export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const profile = await getProfile().catch(() => null);

  return (
    // `type-chrome` swaps the heading face to Marcellus for this whole surface.
    // It lives on the shell rather than on <body> so an invitation preview
    // rendered inside a marketing page keeps its own theme's type.
    <div className="type-chrome flex min-h-dvh flex-col bg-bg">
      <JsonLd nodes={[organizationJsonLd(), websiteJsonLd()]} />
      <SiteHeader
        signedIn={Boolean(profile)}
        dashboardHref={profile ? homeFor(profile.role) : "/login"}
      />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
