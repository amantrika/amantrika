import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getProfile } from "@/lib/auth";
import { aiProviderName, getAiProvider, allTasks, configuredModels } from "@/lib/ai";

/**
 * "Is the AI connection working?" — answered without a shell.
 *
 * Guarded two ways, because it is useful to two callers: a signed-in admin
 * checking a deployment from a browser, and a script or uptime monitor holding
 * `CRON_SECRET`. Anyone else gets a 404 rather than a 401 — an unauthenticated
 * visitor should not learn that this route exists.
 *
 * The response names models, tasks and latency. It never contains the API key,
 * any part of it, or its length.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearerMatchesCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!presented) return false;

  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which would itself leak length.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function isAuthorised(request: Request): Promise<boolean> {
  if (bearerMatchesCronSecret(request)) return true;
  const profile = await getProfile();
  return profile?.role === "admin";
}

export async function GET(request: Request) {
  if (!(await isAuthorised(request))) {
    return new NextResponse(null, { status: 404 });
  }

  const provider = getAiProvider();
  const health = await provider.health();

  return NextResponse.json(
    {
      ...health,
      configured: aiProviderName(),
      // Useful at a glance when debugging a "why is nothing happening" report:
      // which tiers point at which models, and which tasks would send guest
      // words to a third party.
      tiers: configuredModels(),
      tasks: allTasks.map((task) => ({
        id: task.id,
        tier: task.tier,
        handlesGuestContent: task.handlesGuestContent,
      })),
    },
    // 503 when it is genuinely unusable, so a monitor can alert on the status
    // code alone without parsing the body.
    { status: health.ok ? 200 : 503 }
  );
}
