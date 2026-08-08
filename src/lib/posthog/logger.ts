import "server-only";
import { SeverityNumber, type Logger } from "@opentelemetry/api-logs";

/**
 * Structured server logs, shipped to PostHog by `src/instrumentation.ts`.
 *
 * Use this instead of bare `console.error` for anything you'd want to search
 * later — a failed publish, a storage upload that rolled back, an RPC that
 * errored. It also writes to the console so `vercel logs` and local `next dev`
 * still show everything.
 *
 * Same privacy rule as events: log ids, codes and counts — never guest names,
 * emails, or the contents of a blessing.
 */

declare global {
  var __posthogLogger: Logger | undefined;
}

type Attributes = Record<string, string | number | boolean | undefined>;

function emit(
  severityNumber: SeverityNumber,
  severityText: "DEBUG" | "INFO" | "WARN" | "ERROR",
  body: string,
  attributes: Attributes = {}
) {
  // Drop undefined values — OTLP rejects them.
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) clean[key] = value;
  }

  try {
    globalThis.__posthogLogger?.emit({ severityNumber, severityText, body, attributes: clean });
  } catch {
    // A logging backend must never break a request.
  }

  const line = Object.keys(clean).length ? `${body} ${JSON.stringify(clean)}` : body;
  if (severityText === "ERROR") console.error(line);
  else if (severityText === "WARN") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (body: string, attributes?: Attributes) =>
    emit(SeverityNumber.DEBUG, "DEBUG", body, attributes),
  info: (body: string, attributes?: Attributes) =>
    emit(SeverityNumber.INFO, "INFO", body, attributes),
  warn: (body: string, attributes?: Attributes) =>
    emit(SeverityNumber.WARN, "WARN", body, attributes),
  error: (body: string, attributes?: Attributes) =>
    emit(SeverityNumber.ERROR, "ERROR", body, attributes),
};
