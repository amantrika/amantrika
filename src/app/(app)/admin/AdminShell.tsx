"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart3, Bot, CalendarDays, CreditCard, Images, Lightbulb, Sparkles, Users,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/design-system/components";

/**
 * Grouped rather than a flat list: "what is happening", "what I change" and
 * "what needs a decision from me" are different jobs, and a row of eight items
 * gave no hint which was which.
 */
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match the path exactly. Only /admin needs it, since every route starts with it. */
  exact?: boolean;
}

const groups: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Measure",
    items: [{ href: "/admin", label: "Overview", icon: BarChart3, exact: true }],
  },
  {
    heading: "Manage",
    items: [
      { href: "/admin/users", label: "People", icon: Users },
      { href: "/admin/invitations", label: "Invitations", icon: CalendarDays },
      { href: "/admin/plans", label: "Plans", icon: CreditCard },
      { href: "/admin/ai", label: "AI", icon: Bot },
    ],
  },
  {
    heading: "Review",
    items: [
      { href: "/admin/partners", label: "Partners", icon: Sparkles },
      { href: "/admin/showcase", label: "Showcase", icon: Images },
      { href: "/admin/requests", label: "Requests", icon: Lightbulb },
    ],
  },
];

/**
 * Admin navigation: a sidebar on desktop, a scrolling tab strip on mobile.
 *
 * A sidebar because the admin area now has seven destinations across three
 * different jobs — a horizontal row of seven tabs wraps awkwardly and gives no
 * sense of grouping. On narrow screens a sidebar would eat the content, so it
 * collapses to tabs there.
 *
 * The pending-partners count sits on the item it concerns, so work announces
 * itself without needing the overview.
 */
export function AdminNav({ pendingPartners }: { pendingPartners: number }) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Desktop: sidebar. Sticky under the (also sticky) app header, so the
          section list stays reachable down a long table of invitations. */}
      <nav aria-label="Admin sections" className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.heading}>
              <p className="type-overline px-3">{group.heading}</p>
              <ul className="mt-2 flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href, item.exact);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        // The active row gets a gold rail on its leading edge as
                        // well as a tint: on a tinted sidebar the tint alone is
                        // easy to miss at a glance.
                        className={`flex items-center gap-2.5 rounded-soft border-l-2 px-3 py-2 text-sm font-semibold transition-colors ${
                          active
                            ? "border-accent bg-primary/10 text-primary"
                            : "border-transparent text-muted hover:bg-accent/8 hover:text-foreground"
                        }`}
                      >
                        <Icon
                          aria-hidden
                          className={`size-4 shrink-0 ${active ? "text-accent" : ""}`}
                        />
                        <span className="flex-1">{item.label}</span>
                        {item.href === "/admin/partners" && pendingPartners > 0 && (
                          <Badge tone="error">{pendingPartners}</Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Mobile: horizontal tabs */}
      <nav
        aria-label="Admin sections"
        className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-ornate/40 px-4 lg:hidden"
      >
        {groups.flatMap((g) => g.items).map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <Icon aria-hidden className="size-4" />
              {item.label}
              {item.href === "/admin/partners" && pendingPartners > 0 && (
                <Badge tone="error">{pendingPartners}</Badge>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

/** Feedback strip shared by the admin tables. */
export function AdminFeedback({ message }: { message: { text: string; isError: boolean } | null }) {
  if (!message) return null;
  return (
    <p
      role={message.isError ? "alert" : "status"}
      className={`mb-4 rounded-md border px-3 py-2 type-caption ${
        message.isError
          ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
          : "border-ornate bg-accent/10 text-foreground"
      }`}
    >
      {message.text}
    </p>
  );
}

export function AdminSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="type-h2 text-primary">{title}</h2>
      {description && <p className="mt-1 type-caption">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
