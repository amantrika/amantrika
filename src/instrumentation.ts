import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";

/**
 * Ships server-side logs to PostHog over OTLP.
 *
 * Next.js calls `register()` once per runtime at startup. `instrumentation.ts`
 * is stable in Next 15, so no `experimental.instrumentationHook` flag is needed
 * — setting it would be rejected as an unknown option.
 */
export function register() {
  // The OTLP HTTP exporter needs Node APIs; the edge runtime also invokes
  // register(), so bail out there.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token) return; // Logging is optional, exactly like event capture.

  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

  const exporter = new OTLPLogExporter({
    url: `${host}/otlp/v1/logs`,
    headers: { Authorization: `Bearer ${token}` },
  });

  const loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({
      "service.name": "amantrika-web",
      "service.version": process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
      "deployment.environment": process.env.VERCEL_ENV ?? "development",
    }),
    // Batched rather than Simple: a per-log HTTP round trip would add latency to
    // every request that logs. The window is kept short because a serverless
    // instance can be frozen soon after it responds.
    processors: [
      new BatchLogRecordProcessor({ exporter, scheduledDelayMillis: 500 }),
    ],
  });

  globalThis.__posthogLogger = loggerProvider.getLogger("amantrika-web");
}
