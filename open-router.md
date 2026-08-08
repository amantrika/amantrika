# AI in Amantrika — the OpenRouter integration

This document covers the `src/lib/ai` module: what it is, how to switch it on,
how to check it works, and what it will and will not send to a third party.

**Nothing in the product calls it yet.** It is the foundation, built so that
adding the first AI feature is writing one task definition rather than making
ten architectural decisions under deadline.

---

## 1. Why a module rather than a `fetch`

The snippet OpenRouter gives you looks like this:

```js
fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: 'Bearer sk-or-v1-…' },
  body: JSON.stringify({ model: 'openai/gpt-4o', messages: [...] }),
});
```

Four things are wrong with pasting that into a feature:

1. **The model id is hardcoded.** `openai/gpt-4o` is no longer in OpenRouter's
   catalogue — that exact call now fails. Model slugs are retired far more often
   than anything else in a codebase, and a slug written into a component is a
   time bomb with no test covering it.
2. **The reply is a string.** Every caller ends up writing its own "find the
   JSON in this text" logic, and each one is wrong differently.
3. **It throws.** A rate limit or a cold upstream takes down whatever request
   invoked it. AI features are enhancements; they must fail quietly.
4. **The key is one careless import away from the browser.** An OpenRouter key
   spends prepaid credit. There is no chargeback.

The module fixes each of those by shape rather than by discipline.

---

## 2. Layout

```
src/lib/ai/
  provider.ts    the interface — AiProvider, CompleteInput, results
  models.ts      tier → model id registry, prices, env overrides
  openrouter.ts  the only file that knows OpenRouter exists
  disabled.ts    the no-key provider; every call returns ok:false
  tasks.ts       typed tasks with Zod-validated output, and runTask()
  index.ts       getAiProvider(), aiEnabled(), aiProviderName()

src/app/api/ai/health/route.ts   guarded connection check
scripts/ai-check.mjs             npm run ai:check
```

The same shape as `src/lib/payments`: an interface, concrete implementations,
one entry point, and nothing outside the folder naming a vendor.

---

## 3. Switching it on

### Get a key

1. Add credit at <https://openrouter.ai/credits>. Start with $5 — it is a lot
   of tokens at the tiers below.
2. Create a key at <https://openrouter.ai/settings/keys>.
3. **Set a credit limit on the key itself.** OpenRouter lets you cap spend
   per-key. Do it. It is the only backstop against a runaway loop.

### Local

Add to `.env.local` (already gitignored by the `.env*` rule):

```
OPENROUTER_API_KEY=sk-or-v1-…
CRON_SECRET=…                 # any long random string; openssl rand -hex 32
```

### Vercel

Set both in **Project → Settings → Environment Variables**, as *Secret*, for
Production and Preview:

| Name | Value | Environments |
|---|---|---|
| `OPENROUTER_API_KEY` | your key | Production, Preview |
| `CRON_SECRET` | a long random string | Production, Preview |
| `AI_MODEL_FAST` | optional override | as needed |
| `AI_MODEL_BALANCED` | optional override | as needed |
| `AI_MODEL_DEEP` | optional override | as needed |

Or from the CLI, which prompts for the value rather than putting it in your
shell history:

```
vercel env add OPENROUTER_API_KEY production
vercel env add CRON_SECRET production
```

Redeploy afterwards — environment variables are read at build and boot.

### The rules that keep the key safe

- **Never** prefix it `NEXT_PUBLIC_`. Anything so named is inlined into the
  JavaScript bundle and served to every visitor.
- Read it only through `openRouterApiKey()` in `src/lib/env.ts`, which throws
  if it is ever called in a browser.
- Every file in `src/lib/ai` starts with `import "server-only"`, so importing
  any of it from a Client Component is a **build error**, not a runtime
  surprise.
- `.env*` is gitignored. If a key ever does reach a commit or a chat window,
  revoke it — do not rotate it later, revoke it now. Keys are free.

---

## 4. Checking the connection

```
npm run ai:check                                  # localhost:3000
npm run ai:check -- https://amantrika.imswarnil.com
```

Sample output:

```
Checking https://amantrika.imswarnil.com/api/ai/health

Provider  openrouter
Latency   412ms

Model tiers
  fast      openai/gpt-5.6-luna              ok
  balanced  openai/gpt-5.6-terra             ok
  deep      anthropic/claude-sonnet-5        ok

Tasks
  moderate-blessing            fast      sends guest content
  suggest-invitation-wording   balanced  host content only

✔ AI connection is working.
```

It calls the deployment's own `/api/ai/health` rather than OpenRouter directly.
That is deliberate: a script that read your laptop's `.env.local` and called
OpenRouter itself would cheerfully print "all good" while production had no key
at all, which is precisely the failure worth catching.

The health check answers two questions:

- **Does the key work?** Via `/api/v1/key`, which validates the credential
  without spending a token.
- **Do the configured models still exist?** Every tier's id is checked against
  the live catalogue. A retired slug otherwise fails only when a user triggers
  the feature, and reads as "the AI is broken" rather than "someone renamed a
  model".

`/api/ai/health` is guarded two ways — a signed-in `admin` profile, or
`Authorization: Bearer $CRON_SECRET`. Anyone else gets a **404**, not a 401: an
unauthenticated visitor should not learn the route exists. The response names
models, tasks and latency, and never the key or any part of it.

---

## 5. Model tiers

Features ask for a *tier*. `src/lib/ai/models.ts` is the only place a model id
appears, so moving every summarisation in the product onto a cheaper model is
one edit or one environment variable.

| Tier | Default | Input / Output (USD per 1M tokens) | For |
|---|---|---|---|
| `fast` | `openai/gpt-5.6-luna` | $0.10 / $0.60 | classification, moderation, short rewrites |
| `balanced` | `openai/gpt-5.6-terra` | $1.00 / $6.00 | anything a host reads: wording, polish, translation |
| `deep` | `anthropic/claude-sonnet-5` | $2.00 / $10.00 | low-volume, high-stakes work; unused today |

Prices were read from OpenRouter's `/models` endpoint on **2026-08-08** and are
used only for rough cost attribution in logs. OpenRouter's dashboard is the
billing record.

To change one without deploying, set `AI_MODEL_FAST` / `AI_MODEL_BALANCED` /
`AI_MODEL_DEEP` and run `npm run ai:check` to confirm the slug exists.

---

## 6. Using it

### Define a task

A task bundles everything that makes one call reproducible — tier, token
ceiling, prompt, and a Zod schema for the output. The schema is sent to the
model as a strict JSON Schema *and* used to validate the reply, so a caller
receives a typed object or an error, never a string to guess at.

```ts
export const suggestHashtagTask: AiTask<
  { names: string[] },
  { hashtags: string[] }
> = {
  id: "suggest-hashtag",
  tier: "fast",
  maxOutputTokens: 150,
  temperature: 0.8,
  handlesGuestContent: false,
  outputSchema: z.object({ hashtags: z.array(z.string().max(40)).min(3).max(6) }),
  system: "You suggest wedding hashtags for Indian couples. No spaces, no emoji.",
  buildUser: ({ names }) => `Names: ${names.join(" and ")}`,
};
```

### Call it from a Server Action

```ts
"use server";
import { getAiProvider, runTask, suggestHashtagTask } from "@/lib/ai";

export async function suggestHashtags(names: string[]) {
  const result = await runTask(getAiProvider(), suggestHashtagTask, { names });
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const, hashtags: result.data.hashtags };
}
```

`runTask` never throws. It retries once on a timeout, a 429, a 5xx, or a reply
that fails to parse or validate — and does not retry a bad key or an unknown
model, which fail identically the second time.

### Decide whether to show the button

```ts
import { aiEnabled } from "@/lib/ai";

{aiEnabled() && <Button onClick={…}>Suggest wording</Button>}
```

Use `aiEnabled()` to decide what to *render*, never to guard a call. Calls are
always safe: with no key the provider returns `ok: false`.

---

## 7. What leaves the building

This is the part that deserves a decision rather than a default. Amantrika holds
guest phone numbers, addresses and RSVP messages, and operating rule 12 says
guest PII never leaves the owner's authenticated dashboard. Sending text to
OpenRouter sends it to OpenRouter *and* to whichever vendor serves the model.

Every task therefore declares `handlesGuestContent`, and it is enforced as an
audit trail rather than a comment — `tests/unit/ai-tasks.test.ts` asserts the
current values, so flipping one makes a test fail and someone has to update
this table.

| Task | Sends guest content? | What is sent |
|---|---|---|
| `suggest-invitation-wording` | **No** | Host names, occasion, tradition, city, tone — all typed by the host about themselves |
| `moderate-blessing` | **Yes** | The text of one blessing, without the author's name |

Before wiring up anything with `handlesGuestContent: true`:

- Turn on **zero data retention** in OpenRouter's privacy settings, and restrict
  routing to providers that honour it (<https://openrouter.ai/settings/privacy>).
  Without it, prompts may be retained and used for training.
- Say so in the privacy policy. "We may send the text of blessings to a
  third-party AI provider for safety screening" is a sentence a host is entitled
  to read before their relatives write anything.
- Never send the author's name alongside the message. `moderateBlessingTask`
  takes only `{ message }` for exactly this reason, and a unit test pins the
  built prompt so nobody widens it casually.

Logging follows the same rule: `openrouter.ts` logs the task label, tier, model,
token counts, cost and duration — never a prompt, never a completion.

---

## 8. Cost control

There are four brakes, and you should keep all of them:

1. **A credit limit on the key**, set in OpenRouter's dashboard. The only hard
   ceiling.
2. **`maxOutputTokens` is required** on every call, not optional. Output is the
   expensive half of the bill, and these models have million-token context
   windows — an unbounded generation is an unbounded invoice.
3. **A 30-second request timeout.** A hung upstream otherwise holds a
   serverless invocation open until the platform kills it.
4. **One retry, never a loop.** `runTask` attempts twice at most.

Every successful call logs `estimated_usd`. Search your PostHog logs for
`ai completion` to see where the money is going, grouped by `label`.

---

## 9. Adding a different provider

Implement `AiProvider` in a new file, return it from `getAiProvider()` based on
configuration, and change nothing else. The interface exists because the model
market reprices every few months, and the day a direct vendor contract is
cheaper than OpenRouter's margin should be a one-file day.

---

## 10. Troubleshooting

| Symptom | Cause |
|---|---|
| `npm run ai:check` prints `404 — the guard rejected this request` | `CRON_SECRET` locally differs from the deployment's |
| `AI is not configured on this deployment` | `OPENROUTER_API_KEY` unset, or set without redeploying |
| `OPENROUTER_API_KEY was rejected` | Key revoked, or belongs to another account |
| `Not in OpenRouter's catalogue: balanced → …` | Model retired; pick a replacement at <https://openrouter.ai/models> |
| `402` in the logs | Out of credit |
| `The model returned an unexpected shape` | The task's Zod schema and its system prompt disagree; tighten the prompt |
| Build fails with *"server-only cannot be imported from a Client Component"* | Working as intended — move the call into a Server Action |
