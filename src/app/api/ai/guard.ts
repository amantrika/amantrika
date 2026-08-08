import "server-only";
import { getProfile } from "@/lib/auth";
import { bearerMatchesCronSecret } from "@/lib/cron-auth";

/**
 * Who may poke at the AI plumbing.
 *
 * Two callers, because both are legitimate: a signed-in admin checking a
 * deployment from a browser, and a script or uptime monitor holding
 * `CRON_SECRET` — the same token `/api/cron/*` uses, verified by the same
 * constant-time helper. Everyone else gets a 404 from the routes rather than a
 * 401: an unauthenticated visitor should not learn these endpoints exist.
 */
export async function isAiOperator(request: Request): Promise<boolean> {
  if (bearerMatchesCronSecret(request)) return true;
  const profile = await getProfile();
  return profile?.role === "admin";
}
