/**
 * Prove the two providers return the same invitation.
 *
 *   npx tsx --conditions=react-server scripts/aws-parity.ts
 *
 * For every published slug it fetches through the Supabase provider and the AWS
 * provider and diffs the resulting `InviteView`. A switch you cannot verify is
 * a switch you should not flip, and "the page still loads" is not verification
 * — it would still load with the wrong date on it.
 *
 * Differences are printed per field, not as a pass/fail blob, because the
 * interesting outcome is *which* field drifted.
 */
import { createClient } from "@supabase/supabase-js";
import { SupabaseDataProvider } from "../../src/lib/data/supabase-provider";
import { AwsDataProvider } from "../../src/lib/data/aws-provider";
import type { InviteView } from "../../src/lib/invites/invite";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Both mappers turn a null `main_datetime` into `new Date()`, so an invitation
 * without a date produces two timestamps a few milliseconds apart. That is the
 * fallback agreeing, not the providers disagreeing.
 *
 * Recognised explicitly rather than by rounding: if the two values are ever
 * genuinely different dates, this still reports it.
 */
function bothFellBackToNow(a: string, b: string): boolean {
  const now = Date.now();
  const [ta, tb] = [Date.parse(a), Date.parse(b)];
  if (Number.isNaN(ta) || Number.isNaN(tb)) return false;
  const within = (t: number) => Math.abs(now - t) < 60_000;
  return within(ta) && within(tb);
}

/** Fields compared structurally; the rest by value. */
function diff(a: InviteView, b: InviteView): string[] {
  const out: string[] = [];
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof InviteView>;
  for (const k of keys) {
    const av = JSON.stringify(a[k] ?? null);
    const bv = JSON.stringify(b[k] ?? null);
    if (av === bv) continue;
    if (k === "mainDate" && bothFellBackToNow(String(a[k]), String(b[k]))) continue;
    out.push(`    ${String(k)}\n      supabase: ${av}\n      aws:      ${bv}`);
  }
  return out;
}

async function main() {
  const pg = new SupabaseDataProvider();
  const aws = new AwsDataProvider();

  const { data } = await supabase.from("events").select("slug").eq("status", "published");
  const slugs = (data ?? []).map((r) => r.slug);

  console.log(`Comparing ${slugs.length} published invitations\n`);

  let mismatched = 0;
  let missing = 0;

  for (const slug of slugs) {
    const [fromPg, fromAws] = await Promise.all([
      pg.getPublishedInvite(slug),
      aws.getPublishedInvite(slug),
    ]);

    if (!fromPg || !fromAws) {
      missing++;
      console.log(
        `  MISSING  ${slug} — supabase:${fromPg ? "found" : "null"} aws:${fromAws ? "found" : "null"}`
      );
      continue;
    }

    const differences = diff(fromPg, fromAws);
    if (differences.length === 0) {
      console.log(`  match    ${slug}`);
    } else {
      mismatched++;
      console.log(`  DIFFERS  ${slug}`);
      differences.forEach((d) => console.log(d));
    }
  }

  console.log(
    `\n${slugs.length - mismatched - missing} identical, ${mismatched} differing, ${missing} missing on one side.`
  );
  process.exit(mismatched + missing === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
