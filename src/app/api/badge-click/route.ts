import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { log } from "@/lib/posthog/logger";
import { captureAnonymousServer } from "@/lib/posthog/server";
import { EVENTS } from "@/lib/posthog/events";
import type { Database } from "@/lib/supabase/types";

/**
 * Records a tap on the "Made with Amantrika" badge.
 *
 * Reached by `navigator.sendBeacon`, so the response body is never read — return
 * quickly and never throw. The visitor identifier is the same salted daily hash
 * as page views: enough to separate people within a day, deliberately useless
 * for following anyone across days.
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
  let body: { slug?: string; placement?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body.slug) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const country = request.headers.get("x-vercel-ip-country") ?? undefined;

  const { error } = await supabase.rpc("record_badge_click", {
    p_slug: body.slug,
    p_visitor_hash: visitorHash(request),
    p_country: country,
    p_placement: body.placement ?? "invite_badge",
  });

  if (error) log.warn("badge click not recorded", { slug: body.slug, reason: error.message });

  // Mirrored into PostHog so the acquisition loop shows up in funnels next to
  // everything else, keyed by the same rotating hash.
  await captureAnonymousServer(visitorHash(request), EVENTS.badge_clicked, {
    slug: body.slug,
    country,
    placement: body.placement ?? "invite_badge",
  });

  return NextResponse.json({ ok: !error });
}
