import { NextResponse } from "next/server";
import { aiProviderName, getAiProvider, allTasks, configuredModels } from "@/lib/ai";
import { isAiOperator } from "../guard";

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

export async function GET(request: Request) {
  if (!(await isAiOperator(request))) {
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
