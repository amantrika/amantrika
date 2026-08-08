import { describe, expect, it, vi } from "vitest";
import { moderateBlessingTask, runTask, suggestWordingTask } from "@/lib/ai/tasks";
import type { AiProvider, CompleteInput, CompleteResult } from "@/lib/ai/provider";

/**
 * `runTask` is the only thing between a language model and the application, so
 * it is the only part of the AI module worth testing without a network: every
 * other file is either a data table or a thin HTTP wrapper.
 *
 * What matters here is that nothing unvalidated gets through, and that nothing
 * throws — a provider outage must degrade a feature, not fail a request.
 */

function stubProvider(
  responses: CompleteResult[]
): AiProvider & { calls: CompleteInput[] } {
  const calls: CompleteInput[] = [];
  let index = 0;

  return {
    name: "openrouter",
    enabled: true,
    calls,
    async complete(input: CompleteInput) {
      calls.push(input);
      return responses[Math.min(index++, responses.length - 1)];
    },
    async health() {
      return { ok: true, provider: "openrouter" as const };
    },
  };
}

function ok(text: string): CompleteResult {
  return {
    ok: true,
    text,
    model: "test/model",
    usage: { promptTokens: 10, completionTokens: 5, estimatedUsd: 0.0001 },
  };
}

describe("runTask", () => {
  it("returns validated, typed data on a well-formed reply", async () => {
    const provider = stubProvider([ok('{"verdict":"allow","reason":"A blessing in Marathi."}')]);

    const result = await runTask(provider, moderateBlessingTask, { message: "शुभेच्छा!" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.verdict).toBe("allow");
      expect(result.model).toBe("test/model");
    }
  });

  it("sends the task's Zod schema to the model as a strict JSON schema", async () => {
    const provider = stubProvider([ok('{"verdict":"allow","reason":"fine"}')]);

    await runTask(provider, moderateBlessingTask, { message: "congrats" });

    const schema = provider.calls[0].jsonSchema;
    expect(schema?.name).toBe("moderate_blessing");
    // Strict mode rejects the `$schema` annotation Zod emits by default.
    expect(schema?.schema).not.toHaveProperty("$schema");
    expect(schema?.schema).toMatchObject({ additionalProperties: false });
  });

  it("rejects a reply that parses but does not match the schema", async () => {
    // `verdict` is not one of the three allowed values.
    const provider = stubProvider([ok('{"verdict":"maybe","reason":"unsure"}')]);

    const result = await runTask(provider, moderateBlessingTask, { message: "hello" });

    expect(result.ok).toBe(false);
    // Retried once before giving up.
    expect(provider.calls).toHaveLength(2);
  });

  it("rejects a reply that is not JSON at all", async () => {
    const provider = stubProvider([ok("Sure! Here's my answer: allow.")]);

    const result = await runTask(provider, moderateBlessingTask, { message: "hello" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/couldn't read/i);
  });

  it("recovers when the first attempt is malformed and the second is not", async () => {
    const provider = stubProvider([
      ok("not json"),
      ok('{"verdict":"block","reason":"Advertising."}'),
    ]);

    const result = await runTask(provider, moderateBlessingTask, { message: "buy now" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.verdict).toBe("block");
  });

  it("retries a retryable failure once, then gives up without throwing", async () => {
    const provider = stubProvider([{ ok: false, error: "429", retryable: true }]);

    const result = await runTask(provider, moderateBlessingTask, { message: "hi" });

    expect(result.ok).toBe(false);
    expect(provider.calls).toHaveLength(2);
  });

  it("does not retry a failure that cannot succeed on a second try", async () => {
    const provider = stubProvider([
      { ok: false, error: "AI is not configured on this deployment.", retryable: false },
    ]);

    const result = await runTask(provider, moderateBlessingTask, { message: "hi" });

    expect(result.ok).toBe(false);
    expect(provider.calls).toHaveLength(1);
  });

  it("passes the task's own tier and token ceiling, never a raw model id", async () => {
    const provider = stubProvider([ok('{"options":[{"wording":"Please join us.","note":"Short."}]}')]);

    await runTask(provider, suggestWordingTask, {
      occasion: "wedding",
      hostNames: ["Meera", "Rohan"],
      tradition: "hindu",
      city: "Udaipur",
      tone: "warm",
    });

    const call = provider.calls[0];
    expect(call.tier).toBe("balanced");
    expect(call.maxOutputTokens).toBe(700);
    expect(call.label).toBe("suggest-invitation-wording");
    // The interface has no field for a model id — that is the point.
    expect(call).not.toHaveProperty("model");
  });

  it("sends only the fields the task builds, so nothing leaks by accident", async () => {
    const provider = stubProvider([ok('{"verdict":"allow","reason":"fine"}')]);

    await runTask(provider, moderateBlessingTask, { message: "Congratulations!" });

    const user = provider.calls[0].messages.find((m) => m.role === "user");
    expect(user?.content).toBe("Message:\nCongratulations!");
  });
});

describe("task declarations", () => {
  it("flags which tasks send guest-written content to a third party", () => {
    // This is the audit trail open-router.md publishes. If a task changes side,
    // this test is the thing that makes someone update the document.
    expect(moderateBlessingTask.handlesGuestContent).toBe(true);
    expect(suggestWordingTask.handlesGuestContent).toBe(false);
  });

  it("gives every task a log-safe id", () => {
    for (const task of [moderateBlessingTask, suggestWordingTask]) {
      expect(task.id).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe("provider selection", () => {
  it("falls back to the disabled provider when no key is configured", async () => {
    vi.resetModules();
    const previous = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    const { getAiProvider, aiEnabled } = await import("@/lib/ai");

    expect(aiEnabled()).toBe(false);
    const health = await getAiProvider().health();
    expect(health.ok).toBe(false);
    expect(health.error).toMatch(/OPENROUTER_API_KEY/);

    if (previous !== undefined) process.env.OPENROUTER_API_KEY = previous;
  });
});
