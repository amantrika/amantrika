import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { homeFor } from "@/lib/auth";

/**
 * Exchanges the emailed confirmation / magic-link code for a session, then sends
 * the user to the dashboard their role belongs to.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=invalid_code`);
  }

  if (next?.startsWith("/")) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  return NextResponse.redirect(`${origin}${homeFor(profile?.role ?? "host")}`);
}
