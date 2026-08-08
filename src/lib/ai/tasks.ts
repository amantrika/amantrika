import "server-only";
import { z } from "zod";
import { log } from "@/lib/posthog/logger";
import type { ModelTier } from "./models";
import type { AiProvider } from "./provider";

/**
 * TASKS — the layer application code actually uses.
 *
 * A task bundles everything that makes one AI call reproducible: which tier it
 * runs on, how many tokens it may spend, its system prompt, and — the important
 * part — a Zod schema describing its output. That schema is sent to the model
 * as a JSON Schema *and* used to validate what comes back, so a caller receives
 * a typed object or an error, never a string it has to parse and hope about.
 *
 * This mirrors how invitation content is handled (operating rule 8): the Zod
 * schema is the source of truth, and nothing enters the application unvalidated
 * — least of all text a language model generated.
 *
 * To add a feature: define a task here, call `runTask()` from a Server Action.
 * Do not call `provider.complete()` directly unless you genuinely need free
 * text with no shape to it.
 */

export interface AiTask<TInput, TOutput> {
  /** Stable id. Used as the log label and cost-attribution key, so it must
   *  never contain user content. */
  id: string;
  tier: ModelTier;
  /** Hard ceiling on generated tokens for this task. */
  maxOutputTokens: number;
  /** 0 for judgement and extraction; raise only for drafting prose. */
  temperature?: number;
  /**
   * Whether this task may be shown text written by *guests* rather than by the
   * host — a blessing, an RSVP message, a guest's name.
   *
   * It is documentation with teeth: it forces the question "does this send
   * somebody else's words to a third party?" to be answered when the task is
   * written rather than when it is audited, and `open-router.md` lists every
   * task where it is true so the answer is public.
   */
  handlesGuestContent: boolean;
  outputSchema: z.ZodType<TOutput>;
  system: string;
  /** Builds the user turn. Keep the input minimal — everything here is sent. */
  buildUser: (input: TInput) => string;
}

export type TaskResult<TOutput> =
  | { ok: true; data: TOutput; model: string; estimatedUsd: number }
  | { ok: false; error: string };

/** OpenAI-style strict schemas reject the `$schema` annotation Zod emits. */
function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

const RETRY_DELAY_MS = 600;

/**
 * Runs a task and returns validated, typed output.
 *
 * Never throws. Retries once on a retryable failure (timeout, 429, 5xx) and on
 * a malformed reply — a model that returns unparseable JSON usually does not
 * repeat the mistake, and one retry is cheaper than surfacing an error to a
 * host mid-form. It does not retry a bad key or an unknown model, because those
 * fail identically the second time.
 */
export async function runTask<TInput, TOutput>(
  provider: AiProvider,
  task: AiTask<TInput, TOutput>,
  input: TInput,
  options: { signal?: AbortSignal } = {}
): Promise<TaskResult<TOutput>> {
  const jsonSchema = { name: task.id.replace(/-/g, "_"), schema: toStrictJsonSchema(task.outputSchema) };

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await provider.complete({
      tier: task.tier,
      label: task.id,
      maxOutputTokens: task.maxOutputTokens,
      temperature: task.temperature ?? 0,
      jsonSchema,
      signal: options.signal,
      messages: [
        { role: "system", content: task.system },
        { role: "user", content: task.buildUser(input) },
      ],
    });

    if (!result.ok) {
      if (result.retryable && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      return { ok: false, error: result.error };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      if (attempt === 0) continue;
      log.warn("ai task returned unparseable json", { task: task.id, model: result.model });
      return { ok: false, error: "The model returned something we couldn't read." };
    }

    const validated = task.outputSchema.safeParse(parsed);
    if (!validated.success) {
      if (attempt === 0) continue;
      // The issue paths are field names from our own schema, never user content.
      log.warn("ai task failed schema validation", {
        task: task.id,
        model: result.model,
        issues: validated.error.issues.map((i) => i.path.join(".")).join(","),
      });
      return { ok: false, error: "The model returned an unexpected shape." };
    }

    return {
      ok: true,
      data: validated.data,
      model: result.model,
      estimatedUsd: result.usage.estimatedUsd,
    };
  }

  return { ok: false, error: "The model could not be reached." };
}

/* ================================================================== tasks == */

/**
 * Screens a blessing before it appears on a public wall.
 *
 * `events.settings.moderateBlessings` already exists as a host preference with
 * no implementation behind it. This is the shape that would fill it — a
 * recommendation for a human, never an automatic deletion: a false positive on
 * a grandmother's blessing written in transliterated Marathi is far worse than
 * a moderator reading one extra message.
 *
 * Not yet called from anywhere. Wiring it up is a product decision about
 * whether guest words may leave our infrastructure at all — see open-router.md.
 */
export const moderateBlessingTask: AiTask<
  { message: string },
  { verdict: "allow" | "review" | "block"; reason: string }
> = {
  id: "moderate-blessing",
  tier: "fast",
  maxOutputTokens: 200,
  temperature: 0,
  handlesGuestContent: true,
  outputSchema: z.object({
    verdict: z.enum(["allow", "review", "block"]),
    /** One short sentence a human moderator can act on. */
    reason: z.string().max(200),
  }),
  system: [
    "You screen short congratulatory messages left by guests on a wedding invitation page.",
    "Return 'block' only for abuse, harassment, sexual content, spam or advertising.",
    "Return 'review' when you are unsure.",
    "Return 'allow' for anything else — including messages in Hindi, Urdu, Tamil, Marathi",
    "or any Indian language, whether in native script or transliterated into Latin letters,",
    "and including religious blessings, inside jokes and affectionate teasing.",
    "Unfamiliar is not the same as unsafe.",
  ].join(" "),
  buildUser: ({ message }) => `Message:\n${message}`,
};

/**
 * Drafts formal invitation wording from details the host has already typed.
 *
 * Host-facing and host-supplied: nothing a guest wrote is sent. This is the
 * lowest-risk place to introduce AI in this product, which is why it is the
 * one worth building first.
 */
export const suggestWordingTask: AiTask<
  {
    occasion: string;
    hostNames: string[];
    /** e.g. "hindu", "muslim", "interfaith". Shapes register, not content. */
    tradition: string;
    city: string;
    tone: "traditional" | "warm" | "modern";
  },
  { options: { wording: string; note: string }[] }
> = {
  id: "suggest-invitation-wording",
  tier: "balanced",
  maxOutputTokens: 700,
  temperature: 0.7,
  handlesGuestContent: false,
  outputSchema: z.object({
    options: z
      .array(
        z.object({
          wording: z.string().max(400),
          /** Why this phrasing — shown under each suggestion. */
          note: z.string().max(120),
        })
      )
      .min(1)
      .max(3),
  }),
  system: [
    "You write invitation wording for Indian celebrations.",
    "Give exactly three options in the requested tone.",
    "Use the families' own vocabulary for the ceremonies; never translate a ceremony name",
    "into a generic English equivalent. Do not invent details that were not supplied —",
    "no venue, no time, no relatives who were not named.",
    "Keep each option under sixty words.",
  ].join(" "),
  buildUser: ({ occasion, hostNames, tradition, city, tone }) =>
    [
      `Occasion: ${occasion}`,
      `Hosts: ${hostNames.join(" and ")}`,
      `Tradition: ${tradition}`,
      city ? `City: ${city}` : "",
      `Tone: ${tone}`,
    ]
      .filter(Boolean)
      .join("\n"),
};

/**
 * Metadata for every task, for the health endpoint and the docs to enumerate.
 *
 * Summaries rather than the tasks themselves: a list of `AiTask<A, B>` with
 * different input types has no honest element type, and nothing that wants to
 * *list* tasks ever wants to run one.
 */
export interface AiTaskSummary {
  id: string;
  tier: ModelTier;
  maxOutputTokens: number;
  handlesGuestContent: boolean;
}

function summarise<I, O>(task: AiTask<I, O>): AiTaskSummary {
  return {
    id: task.id,
    tier: task.tier,
    maxOutputTokens: task.maxOutputTokens,
    handlesGuestContent: task.handlesGuestContent,
  };
}

export const allTasks: AiTaskSummary[] = [
  summarise(moderateBlessingTask),
  summarise(suggestWordingTask),
];
