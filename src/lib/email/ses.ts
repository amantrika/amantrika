import "server-only";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { awsRegion } from "@/lib/aws/env";
import { emailFrom } from "@/lib/env";
import type { SendEmailInput, SendEmailResult } from "@/lib/email/send";

const client = new SESv2Client({ region: awsRegion, maxAttempts: 3 });

/**
 * SES: the AWS half of `sendEmail()`.
 *
 * Two differences from Resend worth knowing, because both are silent failures
 * rather than errors:
 *
 * 1. **No idempotency key.** Resend deduplicates a retried send for you; SES
 *    has no equivalent, so a webhook that retries will send twice. Until the
 *    ledger that would deduplicate it exists, the key is used only as the
 *    message's `X-Idempotency-Key` header — useful for tracing, useless for
 *    prevention. Do not read a passing test as proof this is handled.
 *
 * 2. **The sandbox.** A new SES account may only send to verified addresses, at
 *    200 a day. A send to anyone else fails with `MessageRejected`, which is
 *    reported here rather than swallowed so the cause is obvious rather than
 *    "the email never arrived".
 */
export async function sendViaSes(input: SendEmailInput): Promise<SendEmailResult> {
  const { to, subject, html, text, replyTo, unsubscribeUrl, idempotencyKey } = input;

  const headers = [
    ...(unsubscribeUrl
      ? [
          { Name: "List-Unsubscribe", Value: `<${unsubscribeUrl}>` },
          { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
        ]
      : []),
    ...(idempotencyKey ? [{ Name: "X-Idempotency-Key", Value: idempotencyKey }] : []),
  ];

  try {
    const res = await client.send(
      new SendEmailCommand({
        FromEmailAddress: emailFrom,
        Destination: { ToAddresses: Array.isArray(to) ? to : [to] },
        ...(replyTo ? { ReplyToAddresses: [replyTo] } : {}),
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: {
              Html: { Data: html, Charset: "UTF-8" },
              Text: { Data: text, Charset: "UTF-8" },
            },
            ...(headers.length ? { Headers: headers } : {}),
          },
        },
      })
    );

    return { ok: true, id: res.MessageId ?? "" };
  } catch (e) {
    const err = e as { name?: string; message?: string };
    // Subject, never recipient: addresses are guest PII (CLAUDE.md §2.12).
    console.error(`[email] SES send failed (${subject}): ${err.name} — ${err.message}`);
    return { ok: false, error: err.message ?? "SES send failed" };
  }
}
