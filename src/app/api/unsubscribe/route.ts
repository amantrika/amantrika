import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { unsubscribeToken } from "@/lib/notifications/ledger";
import { log } from "@/lib/posthog/logger";

/**
 * One-click unsubscribe, honoured immediately (spec §15).
 *
 * Answers both the RFC 8058 `POST` that mail clients send when the user presses
 * their own "unsubscribe" button, and the `GET` a person gets by clicking the
 * link in the footer. Both do the same thing, because an unsubscribe that needs
 * a second confirmation step is an unsubscribe you are hoping people abandon.
 *
 * The link is HMAC-signed over address and scope, so editing the address in the
 * URL cannot unsubscribe somebody else, and no session is required — the whole
 * point is that it works from an email client.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPES = new Set(["all", "nudge", "reminder", "digest", "marketing"]);

async function unsubscribe(request: Request): Promise<{ ok: boolean; status: number }> {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const scope = url.searchParams.get("scope") ?? "all";
  const token = url.searchParams.get("token");

  if (!email || !token || !SCOPES.has(scope)) return { ok: false, status: 400 };

  const expected = unsubscribeToken(email, scope);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 403 };
  }

  const { error } = await createAdminClient().rpc("notification_optout", {
    p_email: email,
    p_scope: scope,
  });

  if (error) {
    // Never log the address itself — it is exactly the PII rule 12 protects.
    log.error("unsubscribe could not be recorded", { scope, reason: error.message });
    return { ok: false, status: 500 };
  }

  return { ok: true, status: 200 };
}

export async function POST(request: Request) {
  const { ok, status } = await unsubscribe(request);
  return NextResponse.json({ ok }, { status });
}

export async function GET(request: Request) {
  const { ok, status } = await unsubscribe(request);

  if (!ok) {
    return new NextResponse(page("We couldn't process that link", "The link may have expired."), {
      status,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(
    page("You're unsubscribed", "We won't email you about this again. Nothing else changes."),
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

/** Deliberately standalone: reached from an email client, not from the app. */
function page(heading: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${heading} · Amantrika</title></head>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#faf7f2;font-family:Georgia,serif;color:#2b1d1d;">
<main style="max-width:32rem;padding:2rem;text-align:center;">
<h1 style="color:#7b2d3b;font-size:1.5rem;">${heading}</h1>
<p style="font-size:1rem;line-height:1.6;">${body}</p>
</main></body></html>`;
}
