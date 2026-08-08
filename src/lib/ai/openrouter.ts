import "server-only";
import { openRouterApiKey, siteUrl } from "@/lib/env";
import { log } from "@/lib/posthog/logger";
import { configuredModels, estimateUsd, modelFor } from "./models";
import type {
  AiProvider,
  CompleteInput,
  CompleteResult,
  HealthResult,
  ModelHealth,
} from "./provider";

/**
 * OpenRouter is one HTTP API in front of every major model vendor, billed from
 * one balance. For a product that will want a cheap classifier and an expensive
 * writer — and will want to change its mind about both — that beats holding a
 * separate account, key and SDK per vendor.
 *
 * Everything provider-specific lives in this file. Nothing outside `src/lib/ai`
 * imports it, and nothing outside this folder knows OpenRouter exists.
 */

const API_ROOT = "https://openrouter.ai/api/v1";

/**
 * No request may outlive this. Without it a hung upstream holds a serverless
 * invocation open until the platform kills it, and the user watches a spinner
 * for the whole duration.
 */
const REQUEST_TIMEOUT_MS = 30_000;

/** The catalogue changes slowly; the health check need not re-fetch it hourly. */
const MODEL_LIST_TIMEOUT_MS = 10_000;

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${openRouterApiKey()}`,
    // OpenRouter attributes usage to these on its dashboard and rankings. They
    // are public identifiers, not secrets.
    "HTTP-Referer": siteUrl,
    "X-Title": "Amantrika",
    "Content-Type": "application/json",
  };
}

/** Wraps a caller's signal with our own timeout, so both can abort the request. */
function withTimeout(ms: number, signal?: AbortSignal): { signal: AbortSignal; done: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("timeout")), ms);

  const onAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    },
  };
}

/** 408/409/429 and 5xx are worth retrying; everything else is our own fault. */
function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

type ChatCompletionResponse = {
  choices?: { message?: { content?: string | null } }[];
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string; code?: number | string };
};

export class OpenRouterProvider implements AiProvider {
  readonly name = "openrouter" as const;
  readonly enabled = true;

  async complete(input: CompleteInput): Promise<CompleteResult> {
    const model = modelFor(input.tier);
    const { signal, done } = withTimeout(REQUEST_TIMEOUT_MS, input.signal);
    const startedAt = Date.now();

    try {
      const response = await fetch(`${API_ROOT}/chat/completions`, {
        method: "POST",
        headers: headers(),
        signal,
        body: JSON.stringify({
          model,
          messages: input.messages,
          max_tokens: input.maxOutputTokens,
          temperature: input.temperature ?? 0,
          // `json_schema` with `strict` makes the model's reply parseable by
          // construction. Without it, structured output is a prompt-shaped
          // hope, and every caller ends up writing its own brace-matching.
          ...(input.jsonSchema
            ? {
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: input.jsonSchema.name,
                    strict: true,
                    schema: input.jsonSchema.schema,
                  },
                },
              }
            : {}),
        }),
      });

      const body = (await response.json().catch(() => null)) as ChatCompletionResponse | null;

      if (!response.ok) {
        // The upstream message can quote the request; log the status and our own
        // label, never the body, which may contain a guest's words.
        log.warn("ai completion rejected", {
          label: input.label,
          model,
          status: response.status,
        });
        return {
          ok: false,
          error: body?.error?.message ?? `OpenRouter returned ${response.status}`,
          retryable: isRetryableStatus(response.status),
        };
      }

      // A 200 carrying an `error` object happens on mid-stream provider
      // failures. Treating it as success would hand the caller an empty string.
      if (body?.error) {
        return { ok: false, error: body.error.message ?? "OpenRouter reported an error", retryable: true };
      }

      const text = body?.choices?.[0]?.message?.content ?? "";
      if (!text) {
        return { ok: false, error: "OpenRouter returned an empty completion", retryable: true };
      }

      const promptTokens = body?.usage?.prompt_tokens ?? 0;
      const completionTokens = body?.usage?.completion_tokens ?? 0;
      const estimatedUsd = estimateUsd(input.tier, promptTokens, completionTokens);

      // Counts and costs only — never the prompt or the completion. Guest words
      // and host drafts are not ours to put in a log (operating rule 12).
      log.info("ai completion", {
        label: input.label,
        tier: input.tier,
        model: body?.model ?? model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        estimated_usd: Number(estimatedUsd.toFixed(6)),
        duration_ms: Date.now() - startedAt,
      });

      return {
        ok: true,
        text,
        model: body?.model ?? model,
        usage: { promptTokens, completionTokens, estimatedUsd },
      };
    } catch (cause) {
      const aborted = cause instanceof Error && cause.name === "AbortError";
      const error = aborted
        ? `No response within ${REQUEST_TIMEOUT_MS / 1000}s`
        : cause instanceof Error
          ? cause.message
          : "Request failed";

      log.warn("ai completion failed", { label: input.label, model, reason: error });
      return { ok: false, error, retryable: true };
    } finally {
      done();
    }
  }

  /**
   * Two questions in one call: does the key work, and do the models we have
   * configured still exist? The second matters more in practice — a retired
   * slug fails only when a user triggers the feature, and reads as "the AI is
   * broken" rather than "someone renamed a model".
   */
  async health(): Promise<HealthResult> {
    const startedAt = Date.now();
    const { signal, done } = withTimeout(MODEL_LIST_TIMEOUT_MS);

    try {
      // `/key` is the cheapest authenticated endpoint: it validates the
      // credential without spending a single token.
      const keyResponse = await fetch(`${API_ROOT}/key`, { headers: headers(), signal });

      if (!keyResponse.ok) {
        return {
          ok: false,
          provider: this.name,
          latencyMs: Date.now() - startedAt,
          error:
            keyResponse.status === 401
              ? "OPENROUTER_API_KEY was rejected. It may be revoked, or belong to a different account."
              : `OpenRouter returned ${keyResponse.status} for the key check`,
        };
      }

      const catalogue = await fetch(`${API_ROOT}/models`, { signal });
      const listed = new Set<string>();

      if (catalogue.ok) {
        const body = (await catalogue.json().catch(() => null)) as { data?: { id?: string }[] } | null;
        for (const entry of body?.data ?? []) {
          if (entry.id) listed.add(entry.id);
        }
      }

      // An unreachable catalogue is not a failed health check — the key is
      // valid and calls will work. Report availability as unknown-but-true
      // rather than inventing a failure.
      const models: ModelHealth[] = configuredModels().map(({ tier, model }) => ({
        tier,
        model,
        available: listed.size === 0 ? true : listed.has(model),
      }));

      const missing = models.filter((m) => !m.available);

      return {
        ok: missing.length === 0,
        provider: this.name,
        latencyMs: Date.now() - startedAt,
        models,
        ...(missing.length
          ? {
              error: `Not in OpenRouter's catalogue: ${missing
                .map((m) => `${m.tier} → ${m.model}`)
                .join(", ")}. Pick replacements at https://openrouter.ai/models`,
            }
          : {}),
      };
    } catch (cause) {
      return {
        ok: false,
        provider: this.name,
        latencyMs: Date.now() - startedAt,
        error: cause instanceof Error ? cause.message : "Could not reach OpenRouter",
      };
    } finally {
      done();
    }
  }
}
