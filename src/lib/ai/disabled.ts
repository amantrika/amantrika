import "server-only";
import type { AiProvider, CompleteResult, HealthResult } from "./provider";

/**
 * The provider you get when no key is configured.
 *
 * Every AI feature in this product is an enhancement to something that already
 * works without it — a host can write their own invitation wording, and a
 * blessing can be moderated by a human. So the absence of a key is a supported
 * configuration, not a broken one: a fork, a preview deployment without
 * secrets, or a local checkout all run fine and simply get no suggestions.
 *
 * This exists so callers never have to write `if (aiEnabled())` around every
 * call. They handle `ok: false` — which they must handle anyway, because the
 * network exists.
 */
export class DisabledAiProvider implements AiProvider {
  readonly name = "disabled" as const;
  readonly enabled = false;

  async complete(): Promise<CompleteResult> {
    return {
      ok: false,
      error: "AI is not configured on this deployment.",
      // Retrying cannot conjure a key.
      retryable: false,
    };
  }

  async health(): Promise<HealthResult> {
    return {
      ok: false,
      provider: this.name,
      error:
        "No OPENROUTER_API_KEY is set, so AI features are switched off. " +
        "See open-router.md to enable them.",
    };
  }
}
