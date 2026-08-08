#!/usr/bin/env node
/**
 * Runs one AI task against the real provider and prints what came back.
 *
 *   npm run ai:try                                    list the tasks
 *   npm run ai:try -- suggest-invitation-wording      run it with sample input
 *   npm run ai:try -- moderate-blessing '{"message":"Congratulations!"}'
 *   AI_TARGET=https://amantrika.imswarnil.com npm run ai:try -- moderate-blessing
 *
 * `ai:check` proves the key works. This proves a *task* works — the prompt, the
 * output schema and the model actually agreeing with each other, which no
 * credential check can tell you.
 *
 * It costs real tokens. Each task caps its own output, so a run is fractions of
 * a cent, but it is not free.
 */

// `@next/env` is CommonJS, so ESM cannot destructure its exports at import time.
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const target =
  process.env.AI_TARGET ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;

const bold = (s) => `\u001b[1m${s}\u001b[0m`;
const dim = (s) => `\u001b[2m${s}\u001b[0m`;
const green = (s) => `\u001b[32m${s}\u001b[0m`;
const red = (s) => `\u001b[31m${s}\u001b[0m`;

if (!secret) {
  console.error(red("CRON_SECRET is not set."));
  console.error(dim("It guards /api/ai/try. Add it to .env.local."));
  process.exit(2);
}

const url = new URL("/api/ai/try", target).toString();
const auth = { Authorization: `Bearer ${secret}` };

/** The task list, with each task's own sample input. One source of truth: the
 *  task definitions, not a copy in this script that would drift from them. */
async function fetchTasks() {
  let response;
  try {
    response = await fetch(url, { headers: auth, signal: AbortSignal.timeout(15_000) });
  } catch (cause) {
    console.error(red(`Could not reach ${url}`));
    console.error(dim(String(cause?.message ?? cause)));
    console.error(dim("Is the dev server running? `npm run dev`"));
    process.exit(1);
  }
  if (response.status === 404) {
    console.error(red("404 — the guard rejected this request."));
    console.error(dim("Your CRON_SECRET does not match the one on that deployment."));
    process.exit(1);
  }
  const body = await response.json().catch(() => null);
  return body?.tasks ?? [];
}

const tasks = await fetchTasks();
const task = process.argv[2];

if (!task) {
  console.log(bold("Usage: npm run ai:try -- <task> [json-input]\n"));
  console.log(bold("Available tasks:"));
  for (const t of tasks) {
    const flag = t.handlesGuestContent ? " (sends guest content)" : "";
    console.log(`  ${t.id}  ${dim(`${t.tier} tier${flag}`)}`);
    console.log(dim(`    ${JSON.stringify(t.sampleInput)}`));
  }
  process.exit(0);
}

const definition = tasks.find((t) => t.id === task);

let input;
if (process.argv[3]) {
  try {
    input = JSON.parse(process.argv[3]);
  } catch {
    console.error(red("The second argument must be valid JSON."));
    process.exit(2);
  }
} else if (definition) {
  input = definition.sampleInput;
  console.log(dim(`Using sample input: ${JSON.stringify(input)}\n`));
} else {
  console.error(red(`Unknown task "${task}".`));
  console.error(dim(`Available: ${tasks.map((t) => t.id).join(", ")}`));
  process.exit(2);
}

console.log(`${bold("Running")} ${task} ${dim(`via ${url}`)}\n`);

let response;
try {
  response = await fetch(url, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ task, input }),
    signal: AbortSignal.timeout(60_000),
  });
} catch (cause) {
  console.error(red(`Could not reach ${url}`));
  console.error(dim(String(cause?.message ?? cause)));
  console.error(dim("Is the dev server running? `npm run dev`"));
  process.exit(1);
}

if (response.status === 404) {
  console.error(red("404 — the guard rejected this request."));
  console.error(dim("Your CRON_SECRET does not match the one on that deployment."));
  process.exit(1);
}

const body = await response.json().catch(() => null);
if (!body) {
  console.error(red(`Unexpected response (HTTP ${response.status}) with no JSON body.`));
  process.exit(1);
}

if (!body.ok) {
  console.error(red("✘ The task failed."));
  console.error(dim(body.error ?? `HTTP ${response.status}`));
  if (body.available) console.error(dim(`Available: ${body.available.join(", ")}`));
  process.exit(1);
}

console.log(`${bold("Model")}      ${body.model}  ${dim(`(${body.tier} tier)`)}`);
console.log(`${bold("Took")}       ${body.durationMs}ms`);
console.log(`${bold("Cost")}       ~$${body.estimatedUsd}`);
console.log(`\n${bold("Validated output")}`);
console.log(JSON.stringify(body.data, null, 2));
console.log(`\n${green("✔ Task ran and its output matched the schema.")}`);
