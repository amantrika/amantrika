import { NextResponse } from "next/server";
import { z } from "zod";
import { getAiProvider, runnableTasks } from "@/lib/ai";
import { isAiOperator } from "../guard";

/**
 * Runs one task against the real provider and returns what came back.
 *
 * A credential check proves the key works; it does not prove a task works. The
 * prompt can be wrong, the output schema can disagree with the prompt, and a
 * model can refuse — none of which `/api/ai/health` would notice. This is the
 * smallest thing that exercises the whole path: input validation, the strict
 * JSON schema, the call, parsing, and output validation.
 *
 * It is a debugging tool, not a product surface. Same guard as the health
 * route — an admin session or `CRON_SECRET`, 404 to everyone else — and it can
 * only run tasks that exist in the registry, with input each task validates
 * itself. There is no free-text prompt field, deliberately: an open relay to a
 * paid model behind a shared secret is a liability, not a feature.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  task: z.string().min(1),
  input: z.unknown(),
});

/** The task list with each task's own sample input, so callers need not carry
 *  their own copies and let them drift from the schemas. */
export async function GET(request: Request) {
  if (!(await isAiOperator(request))) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json({
    tasks: Object.values(runnableTasks).map((entry) => entry.summary),
  });
}

export async function POST(request: Request) {
  if (!(await isAiOperator(request))) {
    return new NextResponse(null, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Body must be {"task": "<id>", "input": { … }}' },
      { status: 400 }
    );
  }

  const entry = runnableTasks[parsed.data.task];
  if (!entry) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unknown task "${parsed.data.task}".`,
        available: Object.keys(runnableTasks),
      },
      { status: 400 }
    );
  }

  const provider = getAiProvider();
  const startedAt = Date.now();
  const result = await entry.run(provider, parsed.data.input);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, task: entry.summary.id, error: result.error },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    task: entry.summary.id,
    tier: entry.summary.tier,
    model: result.model,
    estimatedUsd: Number(result.estimatedUsd.toFixed(6)),
    durationMs: Date.now() - startedAt,
    data: result.data,
  });
}
