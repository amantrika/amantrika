"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/** Browser-side client. Safe to call repeatedly — @supabase/ssr memoises internally. */
export function createClient() {
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
