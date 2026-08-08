"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, X } from "lucide-react";

/**
 * NAVIGATION
 *
 * The pieces every shell in the product needs: a header bar, a breadcrumb
 * trail, a section side-nav, and pagination. They were previously written once
 * per shell — the marketing header, the dashboard, the design-system docs each
 * had their own — which is why navigating between them changed the chrome
 * underfoot.
 *
 * All of it draws on the token layer only, so a nav bar inside a themed preview
 * takes that theme automatically. Stacking uses `--z-navbar`; nothing here
 * invents a z-index.
 */

export interface NavItem {
  href: string;
  label: string;
  /** Rendered after the label — a count, a "New" badge. */
  trailing?: ReactNode;
}

/** True when `href` is the current page, or an ancestor section of it. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ============================== Navbar ============================== */

export type NavbarVariant = "solid" | "translucent" | "bare";

export function Navbar({
  brand,
  items = [],
  actions,
  variant = "translucent",
  sticky = true,
  /** Overrides route detection — the design-system demos rely on this. */
  activeHref,
  className = "",
}: {
  brand: ReactNode;
  items?: NavItem[];
  /** Buttons on the right: sign in, dashboard, a call to action. */
  actions?: ReactNode;
  variant?: NavbarVariant;
  sticky?: boolean;
  activeHref?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const current = activeHref ?? pathname ?? "";
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // A route change with the drawer still open would leave it covering the page
  // it just navigated to.
  useEffect(() => setOpen(false), [pathname]);

  // Escape closes it, because a full-width drawer with no visible close target
  // is a trap on a phone with no back gesture.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const surface =
    variant === "solid"
      ? "bg-surface border-b border-ornate/30"
      : variant === "translucent"
        ? "bg-bg/90 backdrop-blur border-b border-ornate/30"
        : "";

  return (
    <header
      className={`${sticky ? "sticky top-0" : ""} ${surface} ${className}`}
      style={{ zIndex: "var(--z-navbar)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
        {brand}

        {items.length > 0 && (
          <nav aria-label="Main" className="ml-auto hidden items-center gap-6 md:flex">
            {items.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(current, item.href)} />
            ))}
          </nav>
        )}

        {actions && (
          <div className={`flex items-center gap-2 ${items.length ? "md:ml-0" : ""} ml-auto`}>
            {actions}
          </div>
        )}

        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? "Close menu" : "Open menu"}
            className="ml-2 inline-flex size-10 cursor-pointer items-center justify-center rounded-soft border border-ornate/40 text-primary md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        )}
      </div>

      {/* Rendered rather than toggled with CSS so its links are not in the tab
          order while it is closed. */}
      {open && items.length > 0 && (
        <nav
          id={panelId}
          aria-label="Main"
          className="border-t border-ornate/20 bg-surface px-4 py-3 md:hidden"
        >
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.href}>
                <NavLink
                  item={item}
                  active={isActive(current, item.href)}
                  className="block py-3"
                />
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

function NavLink({
  item,
  active,
  className = "",
}: {
  item: NavItem;
  active: boolean;
  className?: string;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`type-body font-medium transition-colors ${
        active ? "text-primary" : "text-foreground/80 hover:text-primary"
      } ${className}`}
    >
      {item.label}
      {item.trailing}
    </Link>
  );
}

/* ============================ Breadcrumbs ============================ */

/**
 * The trail, with the current page as plain text rather than a link to itself.
 * The separators are `aria-hidden` so a screen reader reads "Blog, Guides,
 * this page" and not "Blog chevron Guides chevron".
 */
export function Breadcrumbs({
  items,
  className = "",
}: {
  /** Ordered root → current. The last entry is rendered as the current page. */
  items: NavItem[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 type-caption">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-1.5">
              {last ? (
                <span aria-current="page" className="font-semibold text-primary">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="transition-colors hover:text-primary">
                  {item.label}
                </Link>
              )}
              {!last && <ChevronRight aria-hidden className="size-3.5 opacity-50" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ============================== SideNav ============================== */

export interface SideNavGroup {
  heading?: string;
  items: NavItem[];
}

/** Section navigation for the docs and the dashboard. */
export function SideNav({
  groups,
  activeHref,
  className = "",
  ariaLabel = "Section",
}: {
  groups: SideNavGroup[];
  activeHref?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const pathname = usePathname();
  const current = activeHref ?? pathname ?? "";

  return (
    <nav aria-label={ariaLabel} className={className}>
      {groups.map((group, i) => (
        <div key={group.heading ?? i} className={i > 0 ? "mt-7" : ""}>
          {group.heading && <p className="type-overline mb-2">{group.heading}</p>}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(current, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-between rounded-soft px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-primary-soft font-semibold text-primary"
                        : "text-foreground/75 hover:bg-accent/10 hover:text-primary"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.trailing}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/* ============================= Pagination ============================= */

/**
 * Numbered pagination with an ellipsis. Every page is a real link, so the
 * crawler and a model reading the blog can both walk the archive — which an
 * "load more" button would prevent.
 */
export function Pager({
  page,
  totalPages,
  hrefFor,
  className = "",
}: {
  /** 1-indexed. */
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  return (
    <nav aria-label="Pagination" className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-1.5">
        <li>
          <PagerLink href={hrefFor(page - 1)} disabled={page <= 1} label="Previous" />
        </li>
        {pages.map((p, i) =>
          p === null ? (
            <li key={`gap-${i}`} aria-hidden className="px-2 type-caption">
              …
            </li>
          ) : (
            <li key={p}>
              <PagerLink href={hrefFor(p)} current={p === page} label={String(p)} />
            </li>
          )
        )}
        <li>
          <PagerLink href={hrefFor(page + 1)} disabled={page >= totalPages} label="Next" />
        </li>
      </ul>
    </nav>
  );
}

/** Always first and last, plus a window of neighbours; `null` is an ellipsis. */
function pageWindow(page: number, total: number): (number | null)[] {
  const keep = new Set([1, total, page - 1, page, page + 1]);
  const out: (number | null)[] = [];
  for (let p = 1; p <= total; p++) {
    if (keep.has(p)) out.push(p);
    else if (out[out.length - 1] !== null) out.push(null);
  }
  return out;
}

function PagerLink({
  href,
  label,
  current = false,
  disabled = false,
}: {
  href: string;
  label: string;
  current?: boolean;
  disabled?: boolean;
}) {
  const base =
    "inline-flex min-w-10 items-center justify-center rounded-soft border px-3 py-2 text-sm font-semibold transition-colors";

  if (disabled) {
    return (
      <span aria-disabled className={`${base} border-ornate/20 text-muted opacity-50`}>
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={
        current
          ? `${base} border-primary bg-primary-soft text-primary`
          : `${base} border-ornate/40 text-foreground/80 hover:border-primary hover:text-primary`
      }
    >
      {label}
    </Link>
  );
}
