import Link from "next/link";
import { AmantrikaMark, AmantrikaWordmark } from "@/design-system/brand";

// Re-exported so every caller still imports its chrome from one place, even
// though the header now lives in its own client module.
export { SiteHeader, siteNav } from "./SiteHeader";

/**
 * One header and one footer for every public page — landing, blog, content
 * pages, showcase. Previously the landing page and the marketing section each
 * had their own, so navigating between them changed the chrome underfoot.
 *
 * The header is the design system's `Navbar` with this site's brand, links and
 * actions poured in — which is also how the nav became usable on a phone, where
 * it previously had no menu at all.
 *
 * Deliberately *not* used by the invite pages: an invitation is the couple's
 * page, and wrapping it in our navigation would make it feel like ours.
 * The dashboard has its own shell for the same reason.
 */

const footerColumns = [
  {
    heading: "Product",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/showcase", label: "Showcase" },
      { href: "/signup", label: "Create an invitation" },
      { href: "/signup?as=agent", label: "Become a partner" },
    ],
  },
  {
    heading: "Read",
    links: [
      { href: "/blog", label: "All posts" },
      { href: "/blog/category/guides", label: "Guides" },
      { href: "/blog/category/traditions", label: "Traditions" },
      { href: "/blog/rss.xml", label: "RSS feed" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "Our story" },
      { href: "/changelog", label: "Changelog" },
      { href: "/roadmap", label: "Roadmap" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Machine-readable",
    links: [
      { href: "/llms.txt", label: "llms.txt" },
      { href: "/sitemap.xml", label: "Sitemap" },
      { href: "/blog/rss.xml", label: "RSS" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ornate/30 bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link href="/" aria-label="Amantrika — home" className="inline-flex items-center gap-2.5 text-primary">
              <AmantrikaMark className="size-7 shrink-0" />
              <AmantrikaWordmark swash={false} />
            </Link>
            <p className="mt-3 max-w-xs type-caption">
              Digital invitations for every celebration. One link, every blessing.
            </p>
          </div>

          {footerColumns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <p className="type-overline">{col.heading}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="type-caption transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-12 border-t border-ornate/20 pt-6 type-caption">
          © {new Date().getFullYear()} Amantrika · Payments are in demo mode — no money moves yet.
        </p>
      </div>
    </footer>
  );
}
