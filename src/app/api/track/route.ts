import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { captureAnonymousServer } from "@/lib/posthog/server";
import { log } from "@/lib/posthog/logger";
import { EVENTS } from "@/lib/posthog/events";
import type { Database } from "@/lib/supabase/types";

/**
 * Records one invite view. Called fire-and-forget from the invite page so the
 * render itself stays cacheable.
 *
 * We never store an IP: the visitor identifier is a salted SHA-256 of
 * IP + user-agent + the current date, which lets us count daily uniques and
 * becomes uncorrelatable the next day.
 */
function visitorHash(request: NextRequest): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const ua = request.headers.get("user-agent") ?? "unknown";
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${ip}|${ua}|${day}|amantrika`).digest("hex").slice(0, 32);
}

export async function POST(request: NextRequest) {
  let body: { slug?: string; guestToken?: string; referrer?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body.slug) return NextResponse.json({ ok: false }, { status: 400 });

  // Anonymous client: record_page_view is security-definer and granted to anon.
  const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const hash = visitorHash(request);
  const country = request.headers.get("x-vercel-ip-country") ?? undefined;

  const { error } = await supabase.rpc("record_page_view", {
    p_slug: body.slug,
    p_visitor_hash: hash,
    p_referrer: body.referrer || undefined,
    // Vercel injects these at the edge; absent locally.
    p_country: country,
    p_city: request.headers.get("x-vercel-ip-city") ?? undefined,
    p_guest_token: body.guestToken || undefined,
  });

  if (error) log.warn("record_page_view failed", { slug: body.slug, reason: error.message });

  // Mirrored into PostHog so guest reach shows up in funnels alongside everything
  // else. Keyed by the same rotating daily hash, so it is not linkable across days.
  await captureAnonymousServer(hash, EVENTS.invite_opened, {
    slug: body.slug,
    country,
    personalised_link: Boolean(body.guestToken),
    has_referrer: Boolean(body.referrer),
  });

  // Analytics must never break the invite — swallow failures.
  return NextResponse.json({ ok: !error });
}
