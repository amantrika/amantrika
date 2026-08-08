import type { UserRole } from "@/lib/supabase/types";

/**
 * Role helpers with no server dependencies, so client components can use them.
 *
 * They live here rather than in `lib/auth.ts` because that module imports the
 * server Supabase client (and therefore `next/headers`); importing it from a
 * client component pulls server-only code into the browser bundle and fails the
 * build.
 */

export const roleLabels: Record<UserRole, string> = {
  host: "Host",
  agent: "Partner agent",
  admin: "Administrator",
};

/** Where each role lands after signing in. */
export function homeFor(role: UserRole): string {
  if (role === "admin") return "/admin";
  if (role === "agent") return "/agent";
  return "/dashboard";
}
