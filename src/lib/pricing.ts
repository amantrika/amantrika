/**
 * The only place in the application where a price is computed.
 *
 * Components display what this returns and nothing else; no route, action or
 * client ever supplies an amount. The functions here are pure — the plan row is
 * read from the database by the caller and passed in — so the discount ladder is
 * testable without a database.
 */

/** The subset of a `plans` row that pricing depends on. */
export type PricedPlan = {
  code: string;
  name: string;
  price_inr: number;
};

export type PriceLine = {
  label: string;
  amount_inr: number;
};

export type ComputedPrice = {
  list_price_inr: number;
  discount_inr: number;
  /** Null when nothing was taken off. Never phrased as a penalty. */
  discount_reason: string | null;
  final_price_inr: number;
  breakdown: PriceLine[];
};

/**
 * Early-bird tiers from project-overview.md §14. Ordered widest lead time first;
 * the first match wins.
 *
 * Deliberately never surfaced as a late fee. A host booking 40 days out sees an
 * ordinary price, not a penalty — they are the majority, because Indian couples
 * confirm venue and date three to six months ahead.
 */
const EARLY_BIRD_TIERS: ReadonlyArray<{
  min_days: number;
  rate: number;
  reason: string;
}> = [
  { min_days: 270, rate: 0.4, reason: "Early bird" },
  { min_days: 180, rate: 0.25, reason: "Early bird" },
  { min_days: 90, rate: 0.1, reason: "Booked early" },
];

/**
 * Off by default: the discount ladder is specified but the underlying list
 * prices are still placeholders, and shipping 40% off a placeholder is worse
 * than shipping no discount at all. Flip `PRICING_EARLY_BIRD=true` once real
 * prices land.
 */
function earlyBirdEnabled(): boolean {
  return process.env.PRICING_EARLY_BIRD === "true";
}

/** Whole days from `now` until `eventDate`, floored. Negative once past. */
export function daysUntil(eventDate: Date, now: Date): number {
  const ms = eventDate.getTime() - now.getTime();
  return Math.floor(ms / 86_400_000);
}

export function computePrice(input: {
  plan: PricedPlan;
  /** The celebration's date, when known. Drives the early-bird tier. */
  eventDate?: Date | null;
  now?: Date;
}): ComputedPrice {
  const { plan, eventDate = null, now = new Date() } = input;

  const list = plan.price_inr;
  const breakdown: PriceLine[] = [{ label: plan.name, amount_inr: list }];

  const tier =
    earlyBirdEnabled() && eventDate && list > 0
      ? EARLY_BIRD_TIERS.find((t) => daysUntil(eventDate, now) >= t.min_days)
      : undefined;

  if (!tier) {
    return {
      list_price_inr: list,
      discount_inr: 0,
      discount_reason: null,
      final_price_inr: list,
      breakdown,
    };
  }

  // Round to whole rupees; the provider is charged in paise derived from this.
  const discount = Math.round(list * tier.rate);
  const reason = `${tier.reason} — you saved ₹${discount.toLocaleString("en-IN")}`;

  breakdown.push({ label: reason, amount_inr: -discount });

  return {
    list_price_inr: list,
    discount_inr: discount,
    discount_reason: reason,
    final_price_inr: list - discount,
    breakdown,
  };
}

/** Rupees to paise. Dodo, like most processors, charges in the minor unit. */
export function toMinorUnits(amountInr: number): number {
  return Math.round(amountInr * 100);
}

export function formatInr(amountInr: number): string {
  return amountInr === 0 ? "Free" : `₹${amountInr.toLocaleString("en-IN")}`;
}
