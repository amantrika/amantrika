import "server-only";
import { hasOpenRouterKey } from "@/lib/env";
import { DisabledAiProvider } from "./disabled";
import { OpenRouterProvider } from "./openrouter";
import type { AiProvider, AiProviderName } from "./provider";

export * from "./provider";
export * from "./models";
export * from "./tasks";

/**
 * The single entry point. Application code calls `runTask()` (see `tasks.ts`)
 * or, rarely, `getAiProvider().complete()` — and never constructs a provider.
 *
 * Which one you get is decided by configuration alone, so turning AI on for a
 * deployment is setting one environment variable, and turning it off is
 * unsetting it. There is no feature flag to forget.
 */

let instance: AiProvider | null = null;

export function aiProviderName(): AiProviderName {
  return hasOpenRouterKey() ? "openrouter" : "disabled";
}

export function getAiProvider(): AiProvider {
  const name = aiProviderName();
  if (!instance || instance.name !== name) {
    instance = name === "openrouter" ? new OpenRouterProvider() : new DisabledAiProvider();
  }
  return instance;
}

/**
 * Whether AI features should be *offered* in the UI.
 *
 * Use this to decide whether to render a "Suggest wording" button — not to
 * decide whether to guard a call. Calls are always safe: with no key the
 * provider returns `ok: false` instead of throwing.
 */
export function aiEnabled(): boolean {
  return getAiProvider().enabled;
}
