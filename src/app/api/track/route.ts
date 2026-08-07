import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
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

  const { error } = await supabase.rpc("record_page_view", {
    p_slug: body.slug,
    p_visitor_hash: visitorHash(request),
    p_referrer: body.referrer ?? null,
    // Vercel injects these at the edge; absent locally.
    p_country: request.headers.get("x-vercel-ip-country"),
    p_city: request.headers.get("x-vercel-ip-city"),
    p_guest_token: body.guestToken ?? null,
  });

  // Analytics must never break the invite — swallow failures.
  return NextResponse.json({ ok: !error });
}
