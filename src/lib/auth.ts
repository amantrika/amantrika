import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { homeFor } from "@/lib/roles";
import { authProviderName } from "@/lib/auth/provider";
import type { Profile, UserRole } from "@/lib/supabase/types";

/**
 * Current signed-in profile, or null. Cached per request so a page and its
 * children don't each hit the database.
 *
 * **This is the auth switch point.** Every protected page in the app already
 * goes through here, so `AUTH_PROVIDER=cognito` moves all of them at once
 * without touching a single page. The return type stays `Profile` — the
 * Supabase row shape — deliberately: changing it would mean editing every
 * consumer, which is exactly the churn a seam exists to avoid.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  if (authProviderName() === "cognito") return getCognitoProfile();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data ?? null;
});

/**
 * The Cognito path: a verified session, then the profile item from DynamoDB.
 *
 * `ensureProfile` rather than a plain read, because there is no trigger
 * guaranteeing the profile exists — see the note in `repo/profiles.ts`. A user
 * who somehow authenticated without one gets it created here rather than
 * bouncing off a broken dashboard forever.
 */
async function getCognitoProfile(): Promise<Profile | null> {
  const { getSessionUser } = await import("@/lib/aws/auth/session");
  const session = await getSessionUser();
  if (!session) return null;

  const { ensureProfile } = await import("@/lib/aws/repo/profiles");
  const item = await ensureProfile({ userId: session.userId, email: session.username });

  // Columns the Postgres row had and DynamoDB does not carry yet are null, not
  // absent: consumers destructure them, and `undefined` would render "undefined"
  // where an empty field belongs.
  return {
    id: item.id,
    email: item.email,
    full_name: item.fullName ?? null,
    role: item.role,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    bio: null,
    city: null,
    instagram: null,
    occasion_note: null,
    phone: null,
    referred_by: null,
  };
}

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
