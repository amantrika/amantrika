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

/** Sample input per task, so a first run needs no JSON typed by hand. */
const samples = {
  "moderate-blessing": {
    message: "बहुत बहुत बधाई! May you both always be this happy. — Nani",
  },
  "suggest-invitation-wording": {
    occasion: "wedding",
    hostNames: ["Meera", "Rohan"],
    tradition: "hindu",
    city: "Udaipur",
    tone: "warm",
  },
};

if (!secret) {
  console.error(red("CRON_SECRET is not set."));
  console.error(dim("It guards /api/ai/try. Add it to .env.local."));
  process.exit(2);
}

const task = process.argv[2];

if (!task) {
  console.log(bold("Usage: npm run ai:try -- <task> [json-input]\n"));
  console.log(bold("Tasks with built-in sample input:"));
  for (const [id, sample] of Object.entries(samples)) {
    console.log(`  ${id}`);
    console.log(dim(`    ${JSON.stringify(sample)}`));
  }
  process.exit(0);
}

let input;
if (process.argv[3]) {
  try {
    input = JSON.parse(process.argv[3]);
  } catch {
    console.error(red("The second argument must be valid JSON."));
    process.exit(2);
  }
} else if (samples[task]) {
  input = samples[task];
  console.log(dim(`Using sample input: ${JSON.stringify(input)}\n`));
} else {
  console.error(red(`No sample input for "${task}" — pass JSON as the second argument.`));
  process.exit(2);
}

const url = new URL("/api/ai/try", target).toString();
console.log(`${bold("Running")} ${task} ${dim(`via ${url}`)}\n`);

let response;
try {
  response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
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
