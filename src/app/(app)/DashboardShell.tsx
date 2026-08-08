import Link from "next/link";
import type { ReactNode } from "react";
import { LogOut, Plus } from "lucide-react";
import { Button } from "@/design-system/components";
import { AmantrikaMark, AmantrikaWordmark } from "@/design-system/brand";
import { DashboardNav } from "./DashboardNav";
import { signOut } from "@/app/(auth)/actions";
import { roleLabels } from "@/lib/auth";
import type { Profile } from "@/lib/supabase/types";

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
  return (
    <div className="type-chrome min-h-screen bg-bg">
      {/* Sticky, because the dashboard scrolls long guest lists and losing the
          way out of the page you are on is the commonest complaint about an
          admin area. */}
      <header className="sticky top-0 border-b border-ornate/30 bg-surface/95 backdrop-blur-md" style={{ zIndex: "var(--z-navbar)" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-5">
            {/* The same lockup the marketing header uses — signing in should
                not feel like arriving at a different company's software. */}
            <Link
              href="/"
              aria-label="Amantrika — home"
              className="group inline-flex shrink-0 items-center gap-2.5 text-primary"
            >
              <AmantrikaMark className="size-7 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5" />
              <AmantrikaWordmark className="hidden sm:inline-flex" swash={false} />
            </Link>
            <DashboardNav role={profile.role} />
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
        <div className="mb-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="type-display-lg text-primary">{title}</h1>
              {subtitle && <p className="mt-2 type-body text-muted">{subtitle}</p>}
            </div>
            {action}
          </div>
          {/* The stitched rule that separates a page's title from its contents
              everywhere else on the site. The dashboard had nothing, so the
              heading and the first card ran together. */}
          <hr aria-hidden className="dhaga-rule mt-6" />
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
