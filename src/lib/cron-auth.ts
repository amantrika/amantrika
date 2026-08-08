import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time check of the `CRON_SECRET` bearer token.
 *
 * Vercel Cron attaches `Authorization: Bearer $CRON_SECRET` to every scheduled
 * invocation when that variable is set, so this is the whole authentication
 * story for `/api/cron/*`. Without the variable set, nothing is authorised —
 * failing closed beats a scheduler anyone can trigger.
 */
export function bearerMatchesCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!presented) return false;

  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which would itself leak length.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
