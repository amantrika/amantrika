"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, User, Users, Wallet, type LucideIcon } from "lucide-react";
import type { Profile } from "@/lib/supabase/types";

/**
 * The signed-in top navigation.
 *
 * Split out of DashboardShell for two reasons. It needs `usePathname` to know
 * which route is current — without it the dashboard was the only surface in the
 * product where you could not tell which page you were on. And the items carry
 * icon *components*, which cannot be serialised across the server/client
 * boundary, so the list has to be built on this side of it rather than passed
 * in by the server shell.
 *
 * The active marker is a filled pill rather than an underline: these rows sit
 * in a bar that already has a bottom border, and a second rule underneath a
 * label just reads as a rendering fault.
 */
interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Profile is appended rather than repeated per role, so a new role cannot ship without it. */
const PROFILE_LINK: DashboardNavItem = { href: "/profile", label: "Profile", icon: User };

const navByRole: Record<Profile["role"], DashboardNavItem[]> = {
  host: [{ href: "/dashboard", label: "My celebrations", icon: LayoutDashboard }],
  agent: [
    { href: "/dashboard", label: "Celebrations", icon: LayoutDashboard },
    { href: "/agent", label: "Clients & earnings", icon: Wallet },
  ],
  admin: [
    { href: "/dashboard", label: "Celebrations", icon: LayoutDashboard },
    { href: "/agent", label: "Earnings", icon: Wallet },
    { href: "/admin", label: "Platform", icon: Users },
  ],
};

/** True for the page itself or anything beneath it — `/dashboard/abc` is still Celebrations. */
function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav({ role }: { role: Profile["role"] }) {
  const pathname = usePathname() ?? "";
  const items = [...(navByRole[role] ?? navByRole.host), PROFILE_LINK];

  return (
    // Scrolls rather than wraps: on a narrow phone four items plus the profile
    // link would push the sign-out button onto a second row.
    <nav aria-label="Sections" className="-mx-1 flex items-center gap-1 overflow-x-auto px-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-1.5 text-sm font-semibold transition-colors ${
              active
                ? "bg-primary-soft text-primary"
                : "text-muted hover:bg-accent/10 hover:text-primary"
            }`}
          >
            <Icon aria-hidden className={`size-4 ${active ? "text-accent" : ""}`} />
            <span className="hidden sm:inline">{label}</span>
            {/* On a phone the labels are hidden to fit, so the icon has to
                carry the name for a screen reader too. */}
            <span className="sr-only sm:hidden">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
