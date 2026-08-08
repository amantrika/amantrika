import "server-only";
import { PostHog } from "posthog-node";
import { analyticsEnabled, posthogHost, posthogKey } from "@/lib/env";
import type { EventName } from "./events";

/**
 * Server-side capture, for the things the browser can't be trusted to report:
 * a publish that actually committed, an order the database marked paid, an RSVP
 * that passed validation. Client events tell you what someone tried; these tell
 * you what really happened.
 */

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!analyticsEnabled) return null;
  if (client) return client;

  client = new PostHog(posthogKey, {
    host: posthogHost,
    // Serverless invocations are short-lived and may freeze immediately after
    // the response, so batching would lose events. Flush eagerly instead.
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

/**
 * Records a server-side event against a known person.
 *
 * `distinctId` must be the Supabase user id, matching what `identify()` sends
 * from the browser — otherwise the same human shows up as two people.
 *
 * Never throws: analytics must not be able to fail a publish or an RSVP.
 */
export async function captureServer(
  distinctId: string,
  event: EventName,
  properties?: Record<string, unknown>
): Promise<void> {
  const ph = getClient();
  if (!ph) return;

  try {
    ph.capture({
      distinctId,
      event,
      properties: { ...properties, $process_person_profile: true, source: "server" },
    });
    await ph.flush();
  } catch {
    // Swallow deliberately — see the contract above.
  }
}

/**
 * Records an event for someone with no account: a guest opening an invitation
 * or leaving a blessing. `$process_person_profile: false` keeps these as
 * anonymous events so we don't create a person profile per wedding guest.
 */
export async function captureAnonymousServer(
  distinctId: string,
  event: EventName,
  properties?: Record<string, unknown>
): Promise<void> {
  const ph = getClient();
  if (!ph) return;

  try {
    ph.capture({
      distinctId,
      event,
      properties: { ...properties, $process_person_profile: false, source: "server" },
    });
    await ph.flush();
  } catch {
    // Swallow deliberately.
  }
}

/** Associates a signed-in person with their traits. Call sparingly. */
export async function identifyServer(
  distinctId: string,
  properties: Record<string, unknown>
): Promise<void> {
  const ph = getClient();
  if (!ph) return;

  try {
    ph.identify({ distinctId, properties });
    await ph.flush();
  } catch {
    // Swallow deliberately.
  }
}

/** Only the domain is ever sent — the address itself stays in Postgres. */
export function emailDomain(email: string | null | undefined): string | undefined {
  if (!email?.includes("@")) return undefined;
  return email.split("@")[1]?.toLowerCase();
}
