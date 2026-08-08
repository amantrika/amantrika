import "server-only";
import type { ModelTier } from "./models";

/**
 * The trust boundary for language models, expressed as one interface.
 *
 * Application code imports `getAiProvider()` and never a concrete class, the
 * same way it never names Dodo or Resend. Swapping OpenRouter for a direct
 * vendor SDK — or for a self-hosted model — should touch one file in this
 * folder and nothing outside it.
 *
 * Two rules this interface enforces by shape rather than by convention:
 *
 *  1. **No raw model ids at call sites.** Callers ask for a `ModelTier`
 *     ("fast" / "balanced" / "deep"); the registry decides what that means
 *     today. Hardcoding `openai/gpt-5.6-terra` in a feature is the same class
 *     of debt as hardcoding a theme id (CLAUDE.md operating rule 5), and model
 *     slugs are retired far more often than themes are.
 *
 *  2. **Nothing throws.** Every method resolves to a result object. An AI
 *     feature is an enhancement; a provider outage, a rate limit or an expired
 *     key must never take down the request that invoked it.
 */

export type AiProviderName = "openrouter" | "disabled";

export type AiRole = "system" | "user" | "assistant";

export interface AiMessage {
  role: AiRole;
  content: string;
}

export interface CompleteInput {
  /** Capability tier, resolved to a concrete model by `models.ts`. */
  tier: ModelTier;
  messages: AiMessage[];
  /**
   * Hard ceiling on generated tokens. Output is the expensive half of every
   * bill, so this is required rather than optional — an unbounded generation
   * against a million-token context window is an unbounded invoice.
   */
  maxOutputTokens: number;
  /** 0 for classification and extraction, higher for drafting prose. */
  temperature?: number;
  /**
   * When set, the model is required to return JSON matching this schema.
   * `runTask()` fills this in from the task's Zod schema — prefer that to
   * calling `complete()` with a hand-written schema.
   */
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  /**
   * Short, stable identifier for logs and cost attribution, e.g.
   * `"moderate-blessing"`. Must never contain user content — it is logged.
   */
  label: string;
  /** Caller-supplied cancellation. A request timeout is applied regardless. */
  signal?: AbortSignal;
}

export interface AiUsage {
  promptTokens: number;
  completionTokens: number;
  /** Estimated from the local price table in `models.ts`. Never authoritative —
   *  OpenRouter's own dashboard is the billing record. */
  estimatedUsd: number;
}

export type CompleteResult =
  | {
      ok: true;
      text: string;
      /** The concrete model that answered — may differ from the tier default
       *  if OpenRouter routed around an outage. Worth logging. */
      model: string;
      usage: AiUsage;
    }
  | {
      ok: false;
      error: string;
      /** True for timeouts, 429s and 5xx — the caller may back off and retry.
       *  False for a bad key, an unknown model or a malformed request. */
      retryable: boolean;
    };

export interface ModelHealth {
  tier: ModelTier;
  /** The id currently configured for this tier. */
  model: string;
  /** False when the id is no longer in the provider's catalogue. */
  available: boolean;
}

export interface HealthResult {
  ok: boolean;
  provider: AiProviderName;
  /** Round-trip time of the credential check, in milliseconds. */
  latencyMs?: number;
  /** Per-tier verdict, so a retired model slug is visible before a user hits it. */
  models?: ModelHealth[];
  /** Present when `ok` is false. Never contains the API key. */
  error?: string;
}

export interface AiProvider {
  readonly name: AiProviderName;

  /** True when this provider can actually reach a model. */
  readonly enabled: boolean;

  complete(input: CompleteInput): Promise<CompleteResult>;

  /**
   * Verifies credentials and that every configured model id still exists.
   * Safe to expose behind an admin guard: the result names models, never keys.
   */
  health(): Promise<HealthResult>;
}
