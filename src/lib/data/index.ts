import "server-only";
import { AwsDataProvider } from "@/lib/data/aws-provider";
import { SupabaseDataProvider } from "@/lib/data/supabase-provider";
import type { DataProvider, DataProviderName } from "@/lib/data/provider";
import { resolveProvider } from "@/lib/stack";

export * from "@/lib/data/provider";

let instance: DataProvider | null = null;

/**
 * Which backend is live.
 *
 * Derived from `STACK` unless `DATA_PROVIDER` overrides it — see `lib/stack.ts`
 * for why both exist. Either way the fallback is `supabase`, because a missing
 * or mistyped variable must degrade to the thing that is known to work rather
 * than to an empty database.
 */
export function dataProviderName(): DataProviderName {
  return resolveProvider(process.env.DATA_PROVIDER, { vercel: "supabase", aws: "aws" });
}

/**
 * The single entry point. No page, action or component may construct a provider
 * itself — that is what keeps the switch a switch rather than a search for
 * every place a client was created.
 */
export function getDataProvider(): DataProvider {
  const wanted = dataProviderName();
  if (!instance || instance.name !== wanted) {
    instance = wanted === "aws" ? new AwsDataProvider() : new SupabaseDataProvider();
  }
  return instance;
}
