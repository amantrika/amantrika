import "server-only";
import { AwsDataProvider } from "@/lib/data/aws-provider";
import { SupabaseDataProvider } from "@/lib/data/supabase-provider";
import type { DataProvider, DataProviderName } from "@/lib/data/provider";

export * from "@/lib/data/provider";

let instance: DataProvider | null = null;

/**
 * Which backend is live. `supabase` unless explicitly told otherwise — the
 * default must be the thing that is known to work, so that a missing or
 * mistyped variable degrades to production behaviour rather than to an empty
 * database.
 */
export function dataProviderName(): DataProviderName {
  return process.env.DATA_PROVIDER === "aws" ? "aws" : "supabase";
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
