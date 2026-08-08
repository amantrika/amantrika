import Link from "next/link";
import type { ReactNode } from "react";
import { LayoutDashboard, LogOut, Plus, User, Users, Wallet } from "lucide-react";
import { Button } from "@/design-system/components";
import { signOut } from "@/app/(auth)/actions";
import { roleLabels } from "@/lib/auth";
import type { Profile } from "@/lib/supabase/types";

const PROFILE_LINK = { href: "/profile", label: "Profile", icon: User };

const navByRole: Record<string, { href: string; label: string; icon: typeof Users }[]> = {
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

/** Signed-in chrome shared by every dashboard route. */
export function DashboardShell({
  profile,
  title,
  subtitle,
  action,
  children,
}: {
  profile: Profile;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  // Profile is appended rather than repeated in each role's list, so a new
  // role can never accidentally ship without it.
  const nav = [...(navByRole[profile.role] ?? navByRole.host), PROFILE_LINK];

  return (
    <div className="type-chrome min-h-screen bg-bg">
      <header className="border-b border-ornate/30 bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-display text-2xl font-semibold text-primary">
              Amantrika
            </Link>
            <nav className="flex items-center gap-1">
              {nav.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-sm font-semibold text-muted transition-colors hover:bg-accent/10 hover:text-primary"
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-semibold text-foreground">
                {profile.full_name ?? profile.email}
              </span>
              <span className="block type-caption">{roleLabels[profile.role]}</span>
            </span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" aria-label="Sign out">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="type-display-lg text-primary">{title}</h1>
            {subtitle && <p className="mt-2 type-body text-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </main>
    </div>
  );
}

export function NewInviteButton() {
  return (
    <Link href="/onboarding">
      <Button variant="celebration">
        <Plus className="size-4" /> New invitation
      </Button>
    </Link>
  );
}
