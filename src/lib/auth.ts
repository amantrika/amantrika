import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { homeFor } from "@/lib/roles";
import type { Profile, UserRole } from "@/lib/supabase/types";

/**
 * Current signed-in profile, or null. Cached per request so a page and its
 * children don't each hit the database.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data ?? null;
});

/** Redirects to /login when signed out. Use at the top of any protected page. */
export async function requireProfile(next = "/dashboard"): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  return profile;
}

/**
 * Redirects to the caller's own dashboard when their role isn't allowed —
 * a signed-in host hitting /admin lands somewhere useful rather than a 403.
 */
export async function requireRole(roles: UserRole[], next = "/dashboard"): Promise<Profile> {
  const profile = await requireProfile(next);
  if (!roles.includes(profile.role)) redirect(homeFor(profile.role));
  return profile;
}

/**
 * Re-exported so existing server-side imports keep working. The definitions live
 * in `lib/roles.ts` because they must be importable from client components too.
 */
export { homeFor, roleLabels } from "@/lib/roles";
