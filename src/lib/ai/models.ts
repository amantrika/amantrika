import "server-only";

/**
 * MODEL REGISTRY
 *
 * Features ask for a *tier*, never a model id. The mapping below is the only
 * place a slug like `openai/gpt-5.6-terra` may appear, which means switching
 * every summarisation in the product to a cheaper model is a one-line edit or
 * an environment variable — not a search across the codebase.
 *
 * Model slugs are retired regularly. Rather than trusting these defaults
 * forever, `provider.health()` checks each configured id against OpenRouter's
 * live catalogue and reports the ones that have disappeared. Run it after any
 * change here (`npm run ai:check`).
 *
 * Prices are USD per *token* and were read from OpenRouter's `/models`
 * endpoint on 2026-08-08. They exist for rough cost attribution in logs;
 * OpenRouter's dashboard is the billing record, not this table.
 */

export const modelTiers = ["fast", "balanced", "deep"] as const;
export type ModelTier = (typeof modelTiers)[number];

interface TierDefinition {
  /** Default OpenRouter model id. Override per-environment; see `envVar`. */
  model: string;
  /** Environment variable that overrides `model`. */
  envVar: string;
  promptUsdPerToken: number;
  completionUsdPerToken: number;
  note: string;
}

const tiers: Record<ModelTier, TierDefinition> = {
  /**
   * High volume, low stakes: classification, moderation, tagging, short
   * rewrites. An order of magnitude cheaper than `balanced`, which matters when
   * the work is "check every blessing on every invitation".
   */
  fast: {
    model: "openai/gpt-5.6-luna",
    envVar: "AI_MODEL_FAST",
    promptUsdPerToken: 0.0000001,
    completionUsdPerToken: 0.0000006,
    note: "cheapest; classification, moderation, short rewrites",
  },

  /** The default for anything a host will read: wording suggestions, prose
   *  polishing, translation. */
  balanced: {
    model: "openai/gpt-5.6-terra",
    envVar: "AI_MODEL_BALANCED",
    promptUsdPerToken: 0.000001,
    completionUsdPerToken: 0.000006,
    note: "default for host-facing text: wording, polish, translation",
  },

  /** Reserved for work where a wrong answer is expensive and rare enough to
   *  pay for — nothing in the product uses it yet. */
  deep: {
    model: "anthropic/claude-sonnet-5",
    envVar: "AI_MODEL_DEEP",
    promptUsdPerToken: 0.000002,
    completionUsdPerToken: 0.00001,
    note: "highest quality; reserve for low-volume, high-stakes work",
  },
};

/** The model id configured for a tier, honouring the environment override. */
export function modelFor(tier: ModelTier): string {
  const definition = tiers[tier];
  return process.env[definition.envVar]?.trim() || definition.model;
}

export function tierDefinition(tier: ModelTier): TierDefinition {
  return tiers[tier];
}

/** Every configured model id, for the health check to verify. */
export function configuredModels(): { tier: ModelTier; model: string }[] {
  return modelTiers.map((tier) => ({ tier, model: modelFor(tier) }));
}

/**
 * Rough cost of one call. Uses the tier's price row rather than the responding
 * model's, so an override to an unpriced model reports the tier's figure — the
 * number is for spotting a runaway loop in the logs, not for invoicing.
 */
export function estimateUsd(
  tier: ModelTier,
  promptTokens: number,
  completionTokens: number
): number {
  const { promptUsdPerToken, completionUsdPerToken } = tiers[tier];
  return promptTokens * promptUsdPerToken + completionTokens * completionUsdPerToken;
}
