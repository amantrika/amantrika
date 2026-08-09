/**
 * EventBridge → Lambda → the existing cron route.
 *
 * Deliberately thin. The job itself stays in `src/app/api/cron/[job]/route.ts`
 * where it is covered by the app's own types and tests; this only replaces
 * Vercel Cron's trigger. Reimplementing the job here would create a second copy
 * that drifts — the exact failure that retired the n8n side-car (`CLAUDE.md` §1).
 */
export async function handler() {
  const siteUrl = process.env.SITE_URL;
  const secret = process.env.CRON_SECRET;

  if (!siteUrl || !secret) {
    throw new Error("SITE_URL and CRON_SECRET are both required to run the cron trigger.");
  }

  const res = await fetch(`${siteUrl}/api/cron/abandoned-draft`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });

  const body = await res.text();

  // Throwing on a non-2xx is what makes the EventBridge invocation fail, which
  // is what surfaces in CloudWatch metrics. Returning quietly would make a
  // broken nightly job indistinguishable from a working one.
  if (!res.ok) {
    throw new Error(`cron/abandoned-draft failed: ${res.status} ${body.slice(0, 300)}`);
  }

  return { statusCode: res.status, body };
}
