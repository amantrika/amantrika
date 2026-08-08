#!/usr/bin/env node
/**
 * Checks that the AI connection works — on whichever deployment you point it at.
 *
 *   npm run ai:check                    against http://localhost:3000
 *   npm run ai:check -- https://amantrika.imswarnil.com
 *
 * It calls the app's own `/api/ai/health` rather than OpenRouter directly, so
 * what it validates is the configuration *that deployment actually has*. A
 * script that read your local `.env.local` and called OpenRouter itself would
 * happily print "all good" while production sat there with no key at all —
 * which is the failure this is meant to catch.
 *
 * Authenticates with CRON_SECRET from the environment. That secret must match
 * the one set on the target deployment.
 */

// `@next/env` is CommonJS, so ESM cannot destructure its exports at import time.
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const target =
  process.argv[2] ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000";

const secret = process.env.CRON_SECRET;

const bold = (s) => `\u001b[1m${s}\u001b[0m`;
const dim = (s) => `\u001b[2m${s}\u001b[0m`;
const green = (s) => `\u001b[32m${s}\u001b[0m`;
const red = (s) => `\u001b[31m${s}\u001b[0m`;
const yellow = (s) => `\u001b[33m${s}\u001b[0m`;

if (!secret) {
  console.error(red("CRON_SECRET is not set."));
  console.error(dim("It guards /api/ai/health. Add it to .env.local and to the deployment."));
  process.exit(2);
}

const url = new URL("/api/ai/health", target).toString();
console.log(`${bold("Checking")} ${url}\n`);

let response;
try {
  response = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(20_000),
  });
} catch (cause) {
  console.error(red(`Could not reach ${url}`));
  console.error(dim(String(cause?.message ?? cause)));
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

console.log(`${bold("Provider")}  ${body.configured}`);
if (body.latencyMs !== undefined) console.log(`${bold("Latency")}   ${body.latencyMs}ms`);

if (body.tiers?.length) {
  console.log(`\n${bold("Model tiers")}`);
  for (const tier of body.tiers) {
    const health = body.models?.find((m) => m.tier === tier.tier);
    const mark = health ? (health.available ? green("ok") : red("missing")) : dim("unknown");
    console.log(`  ${tier.tier.padEnd(9)} ${tier.model.padEnd(32)} ${mark}`);
  }
}

if (body.tasks?.length) {
  console.log(`\n${bold("Tasks")}`);
  for (const task of body.tasks) {
    const flag = task.handlesGuestContent ? yellow("sends guest content") : dim("host content only");
    console.log(`  ${task.id.padEnd(28)} ${task.tier.padEnd(9)} ${flag}`);
  }
}

console.log("");

if (body.ok) {
  console.log(green("✔ AI connection is working."));
  process.exit(0);
}

console.error(red("✘ AI is not usable on this deployment."));
if (body.error) console.error(dim(body.error));
process.exit(1);
