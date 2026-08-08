/**
 * The only place that answers "what is this invitation entitled to".
 *
 * Every surface — the renderer, the builder, metadata, JSON-LD — asks this
 * module and branches on the answer. Nothing anywhere else may branch on a plan
 * code directly, for the same reason nothing may branch on a theme id: the day
 * a fourth plan appears, there must be exactly one file to change.
 *
 * Pure and synchronous by design. The plan code lives on the invitation row
 * (written by the payment webhook), so resolving entitlements costs no query.
 */

export type PlanCode = "free" | "classic" | "premium";

export type Entitlements = {
  planCode: PlanCode;

  /**
   * Free invitations carry the "Made with Amantrika" badge
   * (src/components/invite/MadeWithBadge.tsx). The field keeps its name because
   * it gates the whole free-tier treatment, not just the badge: what the free
   * tier is really denied is reach — no OG image, no Event data, no indexing.
   */
  watermarked: boolean;

  /**
   * Whether this invitation may be represented to crawlers and social cards as
   * a finished thing. Withholding the OG image from a watermarked invitation is
   * a deliberate paywall mechanic (CLAUDE.md §3), not an oversight: a free
   * invitation shared to WhatsApp shows no rich preview, and the difference is
   * what people pay to remove.
   */
  ogImage: boolean;

  /** `Event` JSON-LD is emitted only for invitations that were paid for. */
  structuredData: boolean;

  /** Null means no ceiling. */
  maxSubEvents: number | null;
  maxGuestLinks: number | null;

  blessingWall: boolean;
  analytics: boolean;
  customDomain: boolean;
  richMedia: boolean;
};

/**
 * The plan table, expressed once. Mirrors the `features` column of `plans`;
 * that column is display copy, this is behaviour, and they must agree.
 */
const PLANS: Record<PlanCode, Omit<Entitlements, "planCode">> = {
  free: {
    watermarked: true,
    ogImage: false,
    structuredData: false,
    maxSubEvents: 1,
    maxGuestLinks: 0,
    blessingWall: false,
    analytics: false,
    customDomain: false,
    richMedia: false,
  },
  classic: {
    watermarked: false,
    ogImage: true,
    structuredData: true,
    maxSubEvents: 6,
    maxGuestLinks: 200,
    blessingWall: true,
    analytics: true,
    customDomain: false,
    richMedia: false,
  },
  premium: {
    watermarked: false,
    ogImage: true,
    structuredData: true,
    maxSubEvents: null,
    maxGuestLinks: null,
    blessingWall: true,
    analytics: true,
    customDomain: true,
    richMedia: true,
  },
};

function isPlanCode(value: string): value is PlanCode {
  return value === "free" || value === "classic" || value === "premium";
}

/**
 * An unrecognised plan code resolves to `free`, never to a generous default.
 * A typo or a half-finished migration should cost a watermark, not revenue.
 */
export function entitlementsFor(planCode: string | null | undefined): Entitlements {
  const code = planCode && isPlanCode(planCode) ? planCode : "free";
  return { planCode: code, ...PLANS[code] };
}

/** True when the invitation must render the watermark. */
export function isWatermarked(planCode: string | null | undefined): boolean {
  return entitlementsFor(planCode).watermarked;
}
