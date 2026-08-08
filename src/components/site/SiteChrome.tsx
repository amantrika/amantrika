import Link from "next/link";
import { Button } from "@/design-system/components";

/**
 * One header and one footer for every public page — landing, blog, content
 * pages, showcase. Previously the landing page and the marketing section each
 * had their own, so navigating between them changed the chrome underfoot.
 *
 * Deliberately *not* used by the invite pages: an invitation is the couple's
 * page, and wrapping it in our navigation would make it feel like ours.
 * The dashboard has its own shell for the same reason.
 */

export const siteNav = [
  { href: "/showcase", label: "Showcase" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

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

export function SiteHeader({
  signedIn = false,
  dashboardHref = "/login",
}: {
  signedIn?: boolean;
  dashboardHref?: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-ornate/30 bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
        <Link href="/" className="inline-flex flex-col leading-none">
          <span className="font-display text-2xl font-semibold text-primary">Amantrika</span>
          <svg aria-hidden viewBox="0 0 120 8" className="h-1.5 w-24 text-accent">
            <path
              d="M2 5c20-4 40 3 60-1s40-3 56 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-6 md:flex">
          {siteNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="type-body font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {signedIn ? (
            <Link href={dashboardHref}>
              <Button size="sm">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Create yours</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ornate/30 bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <p className="font-display text-2xl font-semibold text-primary">Amantrika</p>
            <p className="mt-2 max-w-xs type-caption">
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
