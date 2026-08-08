import { Badge, Card, Table } from "@/design-system/components";
import { AdminSection } from "../AdminShell";
import { AiConsole } from "./AiConsole";
import { aiEnabled, allTasks, configuredModels, getAiProvider } from "@/lib/ai";

/**
 * The in-site answer to "is the AI working?".
 *
 * `npm run ai:check` answers it from a terminal; this answers it from the
 * deployment itself, for whoever is looking at the problem — and unlike the
 * script, it can also *run* a task, which is the only way to find out whether a
 * prompt and its output schema actually agree.
 *
 * The whole admin area is behind `requireRole(["admin"])` in the layout, so
 * there is no guard here. The Server Action checks again anyway.
 */

export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  const health = await getAiProvider().health();
  const tiers = configuredModels();

  return (
    <>
      <AdminSection
        title="AI"
        description="Connection, models and a console for running tasks against the real provider."
      >
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            {health.ok ? (
              <Badge tone="success">connected</Badge>
            ) : (
              <Badge tone="error">not working</Badge>
            )}
            <span className="type-caption">
              Provider: <strong className="font-mono">{health.provider}</strong>
            </span>
            {health.latencyMs !== undefined && (
              <span className="type-caption">{health.latencyMs}ms</span>
            )}
          </div>

          {health.error && (
            <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 type-caption text-red-700 dark:text-red-300">
              {health.error}
            </p>
          )}

          {!aiEnabled() && (
            <p className="mt-3 type-caption">
              Set <code className="font-mono">OPENROUTER_API_KEY</code> in{" "}
              <code className="font-mono">.env.local</code> (or in Vercel) and restart. See{" "}
              <code className="font-mono">open-router.md</code>.
            </p>
          )}
        </Card>
      </AdminSection>

      <AdminSection
        title="Models"
        description="Which model each tier resolves to, and whether it is still in OpenRouter's catalogue."
      >
        <Table headers={["Tier", "Model", "Status"]}>
          {tiers.map(({ tier, model }) => {
            const status = health.models?.find((m) => m.tier === tier);
            return (
              <tr key={tier}>
                <td className="px-4 py-3 font-semibold text-primary">{tier}</td>
                <td className="px-4 py-3 font-mono text-sm">{model}</td>
                <td className="px-4 py-3">
                  {!status ? (
                    <span className="type-caption">unknown</span>
                  ) : status.available ? (
                    <Badge tone="success">available</Badge>
                  ) : (
                    <Badge tone="error">retired</Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      </AdminSection>

      <AdminSection
        title="Console"
        description="Runs the same registry a feature would, through the same validation."
      >
        <AiConsole
          enabled={aiEnabled()}
          tasks={allTasks.map((t) => ({
            id: t.id,
            tier: t.tier,
            maxOutputTokens: t.maxOutputTokens,
            handlesGuestContent: t.handlesGuestContent,
            sampleInput: t.sampleInput,
          }))}
        />
      </AdminSection>
    </>
  );
}
