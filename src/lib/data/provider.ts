import "server-only";
import type { InviteView } from "@/lib/invites/invite";

/**
 * The seam between the app and whichever backend is holding the data.
 *
 * This exists so the migration off Supabase can be *switched* rather than
 * *staged*. The alternative — porting one page at a time — means a period where
 * an invitation is read from Postgres and written to DynamoDB, which is worse
 * than either backend alone: two sources of truth, no transaction spanning
 * them, and no clean way back.
 *
 * Same shape as `src/lib/payments/provider.ts`, deliberately. That interface
 * already proved the pattern works here: business logic never names a concrete
 * provider, so switching is one environment variable and no code change.
 *
 * ## Why the methods take `userId` explicitly
 *
 * Supabase enforced ownership inside the database, so a query needed no user
 * argument — RLS read it from the session. DynamoDB has no such layer, so the
 * AWS implementation must be *told* who is asking.
 *
 * The interface therefore takes the acting user explicitly, and the Supabase
 * implementation simply ignores it. That is the right way round: an interface
 * shaped for the weaker guarantee is safe on both, whereas one shaped for RLS
 * would be impossible to implement correctly on DynamoDB.
 */
export type DataProviderName = "supabase" | "aws";

export interface DataProvider {
  readonly name: DataProviderName;

  /**
   * A published invitation by slug, or null. Guest-facing and session-less:
   * it must never return a draft, and must never include owner or guest PII.
   */
  getPublishedInvite(slug: string): Promise<InviteView | null>;
}

/**
 * ## What this interface deliberately does *not* cover yet
 *
 * View recording is absent. `record_page_view()` keys on slug plus a rotating
 * visitor hash and does deduplication work that the DynamoDB counters do not
 * replicate yet, so putting it behind this interface would mean shipping two
 * subtly different definitions of "a view" and having the number change meaning
 * when the switch is flipped.
 *
 * `/api/track` therefore still writes to Supabase under both settings. That is
 * a known, deliberate gap — analytics moves in its own phase, with its own
 * counter design (see `aws/DATA-MODEL.md`), not as a side effect of this one.
 */
