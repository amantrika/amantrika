import "server-only";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@aws/dynamo";
import { tableName } from "@aws/env";
import { META_SK, themePk } from "@aws/keys";

/**
 * Plans and themes — catalogue data.
 *
 * `aws/DATA-MODEL.md` says code stays the source of truth for these and the
 * table is a seeded copy, which is the same rule `CLAUDE.md` §2.5 applies to
 * theme behaviour. They live here because `startCheckout` needs a plan's price
 * and a theme's tier, and on the AWS stack there is no `plans` table to read.
 *
 * Seeded by `scripts/aws-seed.ts`. If a plan is missing from the table the
 * answer is to re-run the seed, never to hardcode a price at a call site —
 * `CLAUDE.md` §2.4 puts every price in `src/lib/pricing.ts` and nowhere else.
 */

export interface PlanItem {
  code: string;
  name: string;
  priceInr: number;
  description?: string;
  features: string[];
  dodoProductId?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ThemeCatalogueItem {
  id: string;
  name: string;
  tier: "free" | "premium";
  isActive: boolean;
  sortOrder: number;
}

export const PLAN_PK = "PLAN" as const;

export async function getPlan(code: string): Promise<PlanItem | null> {
  const res = await ddb.send(
    new GetCommand({ TableName: tableName, Key: { PK: PLAN_PK, SK: `CODE#${code}` } })
  );
  return (res.Item as PlanItem) ?? null;
}

export async function listPlans(): Promise<PlanItem[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": PLAN_PK },
    })
  );
  return ((res.Items ?? []) as PlanItem[])
    .filter((p) => p.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getTheme(id: string): Promise<ThemeCatalogueItem | null> {
  const res = await ddb.send(
    new GetCommand({ TableName: tableName, Key: { PK: themePk(id), SK: META_SK } })
  );
  return (res.Item as ThemeCatalogueItem) ?? null;
}
