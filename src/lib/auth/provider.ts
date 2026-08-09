import "server-only";
import { resolveProvider } from "@/lib/stack";

/**
 * Which identity system is live.
 *
 * Separate from `DATA_PROVIDER` on purpose. They move independently: the guest
 * invitation read is on DynamoDB today while sign-in is still Supabase, and
 * collapsing both into one variable would force an all-or-nothing cutover of
 * two systems that fail in completely different ways.
 *
 * Defaults to `supabase` — the same reasoning as `DATA_PROVIDER`: a missing or
 * mistyped value must degrade to the thing that works.
 */
export type AuthProviderName = "supabase" | "cognito";

export function authProviderName(): AuthProviderName {
  return resolveProvider(process.env.AUTH_PROVIDER, { vercel: "supabase", aws: "cognito" });
}
