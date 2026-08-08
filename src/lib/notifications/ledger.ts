import "server-only";
import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { siteUrl } from "@/lib/env";
import { log } from "@/lib/posthog/logger";

/**
 * Claim, send, record. The order is the point.
 *
 * Every scheduled message is claimed in `automation.notifications` *before* it
 * is sent, keyed on a deterministic dedupe key. A second run inserts, hits the
 * unique index, gets nothing back, and drops the item. That makes overlapping
 * schedules, a retried cron delivery, and a manual run during a scheduled one
 * all safe without a lock.
 *
 * The ledger lives in the `automation` schema, unexposed to PostgREST. This
 * module reaches it through `security definer` functions granted to
 * `service_role` alone, so the table itself stays invisible.
 */

export type NotificationSubject = "profile" | "event" | "order" | "guest" | "agent" | "system";

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export type SendRequest = {
  workflow: string;
  /** The specific message within the workflow, e.g. `draft_72h`. */
  kind: string;
  subjectType: NotificationSubject;
  subjectId: string | null;
  /** Deterministic. This is the idempotency key, not a description. */
  dedupeKey: string;
  to: string;
  email: RenderedEmail;
  /** Scope offered in the one-click unsubscribe link. */
  optOutScope?: "all" | "nudge" | "reminder" | "digest" | "marketing";
};

/** `subject_id` is nullable in the table but not in the generated RPC types. */
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export type SendOutcome = "sent" | "failed" | "skipped" | "already-claimed";

/**
 * `dryRun` renders and ledgers without sending, and keeps the rendered body, so
 * a dry run is a proofreading pass rather than a smoke test.
 */
export async function claimAndSend(
  request: SendRequest,
  options: { dryRun: boolean }
): Promise<SendOutcome> {
  const supabase = createAdminClient();

  const { data: claimId, error: claimError } = await supabase.rpc("notification_claim", {
    p_workflow: request.workflow,
    p_kind: request.kind,
    p_subject_type: request.subjectType,
    // The generated signature is non-nullable; a system-scoped message has no
    // subject, so it passes the empty uuid rather than null.
    p_subject_id: request.subjectId ?? NIL_UUID,
    p_dedupe_key: request.dedupeKey,
    p_channel: "email",
    p_email: request.to,
    p_payload: { subject: request.email.subject },
  });

  if (claimError) {
    log.error("notification could not be claimed", {
      workflow: request.workflow,
      kind: request.kind,
      reason: claimError.message,
    });
    return "failed";
  }

  // Null means an earlier run owns this message. Not an error — the normal way
  // a second pass finds nothing to do.
  if (!claimId) return "already-claimed";

  if (options.dryRun) {
    await supabase.rpc("notification_mark", {
      p_id: claimId,
      p_status: "skipped",
      p_payload: { dry_run: true, html: request.email.html, text: request.email.text },
    });
    return "skipped";
  }

  const result = await sendEmail({
    to: request.to,
    subject: request.email.subject,
    html: request.email.html,
    text: request.email.text,
    // The same key the ledger is keyed on, so a retry between claim and send
    // cannot produce a second delivery even if the claim succeeded twice.
    idempotencyKey: request.dedupeKey,
    unsubscribeUrl: request.optOutScope
      ? unsubscribeUrl(request.to, request.optOutScope)
      : undefined,
  });

  await supabase.rpc("notification_mark", {
    p_id: claimId,
    p_status: result.ok ? "sent" : "failed",
    p_payload: result.ok ? { provider_id: result.id } : {},
    p_error: result.ok ? undefined : result.error,
  });

  return result.ok ? "sent" : "failed";
}

/**
 * A signed link, so unsubscribing needs no session and cannot be used to
 * unsubscribe somebody else by editing the address in the URL.
 */
export function unsubscribeUrl(email: string, scope: string): string {
  const token = unsubscribeToken(email, scope);
  const params = new URLSearchParams({ email, scope, token });
  return `${siteUrl}/api/unsubscribe?${params.toString()}`;
}

export function unsubscribeToken(email: string, scope: string): string {
  const secret = process.env.CRON_SECRET ?? "";
  return createHmac("sha256", secret).update(`${email.toLowerCase()}:${scope}`).digest("hex");
}
