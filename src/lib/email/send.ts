import "server-only";
import { emailFrom } from "@/lib/env";
import { resend } from "@/lib/email/client";
import { resolveProvider } from "@/lib/stack";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  /** Full HTML body. */
  html: string;
  /** Plain-text fallback. Required — every template ships one (spec §21). */
  text: string;
  replyTo?: string;
  /** Stable key so a retried webhook or cron run cannot send twice. */
  idempotencyKey?: string;
  /** RFC 8058 one-click unsubscribe, required on nudge and marketing mail. */
  unsubscribeUrl?: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * The one way this app sends mail.
 *
 * Never throws: a failed notification must not roll back the payment, RSVP or
 * cron run that triggered it. Callers decide whether to retry.
 *
 * Never logs a recipient address — those are guest PII (operating rule 12).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  // Follows STACK, overridable with EMAIL_PROVIDER. Still the *one* way this
  // app sends mail — the rule that retired the n8n side-car (CLAUDE.md §1)
  // survives the migration precisely because the seam is here and not at the
  // call sites.
  if (resolveProvider(process.env.EMAIL_PROVIDER, { vercel: "resend", aws: "ses" }) === "ses") {
    const { sendViaSes } = await import("@/lib/email/ses");
    return sendViaSes(input);
  }

  const { to, subject, html, text, replyTo, idempotencyKey, unsubscribeUrl } = input;

  try {
    const { data, error } = await resend().emails.send(
      {
        from: emailFrom,
        to,
        subject,
        html,
        text,
        ...(replyTo ? { replyTo } : {}),
        ...(unsubscribeUrl
          ? {
              headers: {
                "List-Unsubscribe": `<${unsubscribeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }
          : {}),
      },
      idempotencyKey ? { idempotencyKey } : undefined
    );

    if (error) {
      console.error(`[email] send failed (${subject}): ${error.name} — ${error.message}`);
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id ?? "" };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error(`[email] send threw (${subject}): ${message}`);
    return { ok: false, error: message };
  }
}
