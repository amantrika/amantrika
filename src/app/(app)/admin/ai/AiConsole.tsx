"use client";

import { useState } from "react";
import { Badge, Button, Card, Select, Textarea } from "@/design-system/components";
import { runAiTask, type ConsoleResult } from "./actions";

/**
 * Run a task, see what came back.
 *
 * The point is not the pretty output — it is that this exercises the same path
 * a real feature will: input validation, the strict JSON schema, the call, and
 * output validation. If the prompt and the schema disagree, this is where you
 * find out, before a host does.
 */

export interface ConsoleTask {
  id: string;
  tier: string;
  maxOutputTokens: number;
  handlesGuestContent: boolean;
  sampleInput: unknown;
}

export function AiConsole({ tasks, enabled }: { tasks: ConsoleTask[]; enabled: boolean }) {
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  const [input, setInput] = useState(() => JSON.stringify(tasks[0]?.sampleInput ?? {}, null, 2));
  const [result, setResult] = useState<ConsoleResult | null>(null);
  const [running, setRunning] = useState(false);

  const task = tasks.find((t) => t.id === taskId);

  function pick(id: string) {
    setTaskId(id);
    setResult(null);
    const next = tasks.find((t) => t.id === id);
    setInput(JSON.stringify(next?.sampleInput ?? {}, null, 2));
  }

  async function run() {
    setRunning(true);
    setResult(null);
    setResult(await runAiTask(taskId, input));
    setRunning(false);
  }

  if (!tasks.length) {
    return <p className="type-caption">No tasks are defined yet.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <Select
          label="Task"
          value={taskId}
          onChange={(e) => pick(e.target.value)}
          options={tasks.map((t) => ({ value: t.id, label: t.id }))}
        />

        {task && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone="primary">{task.tier} tier</Badge>
            <Badge>max {task.maxOutputTokens} tokens</Badge>
            {task.handlesGuestContent ? (
              <Badge tone="error">sends guest content</Badge>
            ) : (
              <Badge tone="success">host content only</Badge>
            )}
          </div>
        )}

        <Textarea
          label="Input (JSON)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={10}
          className="mt-5 font-mono"
        />

        <Button onClick={run} loading={running} disabled={!enabled} className="mt-5 w-full">
          {running ? "Running…" : "Run task"}
        </Button>

        <p className="mt-3 type-caption">
          {enabled
            ? "This spends real tokens — fractions of a cent, since each task caps its own output."
            : "Set OPENROUTER_API_KEY and restart to enable this."}
        </p>
      </Card>

      <Card className="p-6">
        <p className="type-overline mb-4">Result</p>

        {!result && <p className="type-caption">Nothing run yet.</p>}

        {result && !result.ok && (
          <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 type-caption text-red-700 dark:text-red-300">
            {result.error}
          </p>
        )}

        {result?.ok && (
          <>
            <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 type-caption">
              <dt className="font-semibold text-primary">Model</dt>
              <dd className="font-mono">{result.model}</dd>
              <dt className="font-semibold text-primary">Took</dt>
              <dd>{result.durationMs}ms</dd>
              <dt className="font-semibold text-primary">Cost</dt>
              <dd>~${result.estimatedUsd.toFixed(6)}</dd>
            </dl>
            <p className="type-caption mb-2">
              Validated against the task&apos;s Zod schema — this shape is guaranteed.
            </p>
            <pre className="max-h-96 overflow-auto rounded-soft border border-ornate/40 bg-raised p-4 text-xs">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </>
        )}
      </Card>
    </div>
  );
}
