"use server";

import { requireRole } from "@/lib/auth";
import { getAiProvider, runnableTasks } from "@/lib/ai";

/**
 * Runs one AI task from the admin console.
 *
 * A Server Action rather than a `fetch` to `/api/ai/try`, so the browser never
 * needs `CRON_SECRET` — the admin's own session is the credential, checked here
 * again rather than trusted from the layout. The API route stays for scripts
 * and monitors; this is the same registry behind a different door.
 */

export type ConsoleResult =
  | {
      ok: true;
      model: string;
      tier: string;
      estimatedUsd: number;
      durationMs: number;
      data: unknown;
    }
  | { ok: false; error: string };

export async function runAiTask(taskId: string, inputJson: string): Promise<ConsoleResult> {
  await requireRole(["admin"], "/admin/ai");

  const entry = runnableTasks[taskId];
  if (!entry) return { ok: false, error: `Unknown task "${taskId}".` };

  let input: unknown;
  try {
    input = JSON.parse(inputJson);
  } catch {
    return { ok: false, error: "Input is not valid JSON." };
  }

  const startedAt = Date.now();
  // `runTask` validates the parsed input against the task's own schema before
  // anything is sent, so an admin cannot widen what leaves the building either.
  const result = await entry.run(getAiProvider(), input);

  if (!result.ok) return { ok: false, error: result.error };

  return {
    ok: true,
    model: result.model,
    tier: entry.summary.tier,
    estimatedUsd: result.estimatedUsd,
    durationMs: Date.now() - startedAt,
    data: result.data,
  };
}
