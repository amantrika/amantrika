import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardShell } from "../DashboardShell";
import { AdminNav } from "./AdminShell";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Platform · Amantrika",
  robots: { index: false, follow: false },
};

/**
 * Guards the whole admin area in one place. `requireRole` redirects a non-admin
 * to their own dashboard rather than showing a 403 — but the real boundary is
 * RLS plus the `admin_allowlist` trigger, which stop a forged session reading or
 * writing anything even if this check were bypassed.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(["admin"], "/admin", "/dashboard");

  const supabase = await createClient();
  const { count } = await supabase
    .from("agents")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <DashboardShell
      profile={profile}
      title="Platform"
      subtitle="Everything happening across Amantrika."
    >
      {/* Sidebar beside the content on desktop; AdminNav renders itself as a
          tab strip below `lg`, where a sidebar would eat the page. */}
      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <AdminNav pendingPartners={count ?? 0} />
        <div className="min-w-0">{children}</div>
      </div>
    </DashboardShell>
  );
}
