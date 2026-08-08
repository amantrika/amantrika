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
 * Requires one of `roles`, redirecting rather than showing a 403 — a signed-in
 * person who took a wrong turn should land somewhere useful, not at a wall.
 *
 * `fallback` overrides where they land. Without it they go to whichever home
 * their own role implies, which is right for most cases but wrong for the admin
 * area: an agent bounced from /admin to /agent looks like the app refusing to
 * explain itself. Passing "/dashboard" sends every non-admin to the one page
 * every role has.
 */
export async function requireRole(
  roles: UserRole[],
  next = "/dashboard",
  fallback?: string
): Promise<Profile> {
  const profile = await requireProfile(next);
  if (!roles.includes(profile.role)) redirect(fallback ?? homeFor(profile.role));
  return profile;
}

/**
 * Re-exported so existing server-side imports keep working. The definitions live
 * in `lib/roles.ts` because they must be importable from client components too.
 */
export { homeFor, roleLabels } from "@/lib/roles";
