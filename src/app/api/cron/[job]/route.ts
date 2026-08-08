import { NextResponse } from "next/server";
import { bearerMatchesCronSecret } from "@/lib/cron-auth";
import { runAbandonedDraftNudges } from "@/lib/notifications/jobs/abandoned-draft";
import type { CronJobResult } from "@/lib/notifications/types";
import { log } from "@/lib/posthog/logger";

/**
 * The scheduler. One route, one job per URL, schedules declared in
 * `vercel.json`.
 *
 * This replaces the n8n side-car: same ledger, same claim-before-send
 * idempotency, same SQL — but inside the single deployment CLAUDE.md §2.1 calls
 * for, sending through `sendEmail()` like every other message, and reachable by
 * the test suite.
 *
 * Safe to invoke by hand at any time: every job claims each message before
 * sending it, so a manual run during a scheduled one sends nothing twice.
 * Add `?dryRun=1` to render and ledger without sending.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Nudge batches are capped at 100 recipients, but Resend calls are sequential.
export const maxDuration = 60;

const JOBS: Record<string, (options: { dryRun: boolean }) => Promise<CronJobResult>> = {
  "abandoned-draft": runAbandonedDraftNudges,
};

export async function GET(request: Request, { params }: { params: Promise<{ job: string }> }) {
  const { job } = await params;

  // 404 rather than 401: an unauthenticated caller should not learn which jobs
  // exist, or that the scheduler is here at all.
  if (!bearerMatchesCronSecret(request)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const runner = JOBS[job];
  if (!runner) {
    return NextResponse.json(
      { error: "unknown job", known: Object.keys(JOBS) },
      { status: 404 }
    );
  }

  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";

  const result = await runner({ dryRun });

  log.info("cron job ran", { ...result, dry_run: dryRun });

  return NextResponse.json({ ...result, dryRun });
}
