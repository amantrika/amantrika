import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, serviceRoleKey } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Request-scoped client that respects RLS as the signed-in user.
 * Must be awaited — Next 15 cookies() is async.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — the middleware refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Bypasses RLS. Use only for trusted server work the user cannot be allowed to do
 * under their own grants: view counters, commission ledger writes, admin tooling.
 */
export function createAdminClient() {
  return createServerClient<Database>(env.supabaseUrl, serviceRoleKey(), {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

/**
 * Session-less client for public, cacheable reads.
 *
 * `createClient()` reads cookies, and Next forbids touching a dynamic data
 * source inside `unstable_cache`. These reads are the same for every visitor —
 * plans, the showcase gallery, a published invitation — so they neither need
 * nor should carry a session. Uses the anon key, so RLS still applies exactly
 * as it does for a signed-out visitor.
 */
export function createPublicClient() {
  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
