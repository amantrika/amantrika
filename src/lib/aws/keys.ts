/**
 * Every key in the table is built here, and nowhere else.
 *
 * In Postgres a mistyped column name is a runtime error you find immediately.
 * In DynamoDB a mistyped key prefix is an item written to a partition nobody
 * queries — it succeeds, returns no error, and is invisible until someone
 * notices the data is missing. Centralising key construction is what replaces
 * the type checking the database used to do for us.
 *
 * The full map of entities to keys is `aws/DATA-MODEL.md`. Change both together.
 */

/* -------------------------------------------------------------- partitions */

export const userPk = (userId: string) => `USER#${userId}` as const;
export const eventPk = (eventId: string) => `EVENT#${eventId}` as const;
export const agentPk = (agentId: string) => `AGENT#${agentId}` as const;
export const featurePk = (featureId: string) => `FEATURE#${featureId}` as const;
export const paymentPk = (providerPaymentId: string) => `PAYMENT#${providerPaymentId}` as const;
export const statsPk = (eventId: string) => `STATS#${eventId}` as const;
export const GLOBAL_STATS_PK = "STATS#GLOBAL" as const;
export const themePk = (themeId: string) => `THEME#${themeId}` as const;
export const ADMIN_PK = "ADMIN" as const;

/* --------------------------------------------------------------- sort keys */

export const PROFILE_SK = "PROFILE" as const;
export const META_SK = "META" as const;
export const SHOWCASE_SK = "SHOWCASE" as const;

/**
 * Sort keys that embed a timestamp sort chronologically for free, because
 * DynamoDB orders range keys lexicographically and ISO-8601 is designed so that
 * lexicographic order *is* chronological order. That property is the whole
 * reason "the twenty most recent RSVPs" is a cheap query here.
 *
 * The id suffix only breaks ties — two RSVPs in the same millisecond must not
 * collide and silently overwrite one another.
 */
export const subEventSk = (startsAt: string, id: string) => `SUBEVENT#${startsAt}#${id}` as const;
export const rsvpSk = (createdAt: string, id: string) => `RSVP#${createdAt}#${id}` as const;
export const wishSk = (createdAt: string, id: string) => `WISH#${createdAt}#${id}` as const;
export const commissionSk = (createdAt: string, id: string) =>
  `COMMISSION#${createdAt}#${id}` as const;

export const guestSk = (id: string) => `GUEST#${id}` as const;
export const assetSk = (id: string) => `ASSET#${id}` as const;
export const orderSk = (id: string) => `ORDER#${id}` as const;
export const voteSk = (voterHash: string) => `VOTE#${voterHash}` as const;
export const daySk = (isoDate: string) => `DAY#${isoDate}` as const;
export const adminEmailSk = (email: string) => `EMAIL#${email.toLowerCase()}` as const;

/** Prefixes, for `begins_with` queries that want one kind of child. */
export const SK_PREFIX = {
  subEvent: "SUBEVENT#",
  rsvp: "RSVP#",
  wish: "WISH#",
  guest: "GUEST#",
  asset: "ASSET#",
  order: "ORDER#",
  commission: "COMMISSION#",
  vote: "VOTE#",
  day: "DAY#",
} as const;

/* -------------------------------------------------------------------- GSI1 */

/**
 * Slug lookup. This is the hot path — every guest opening an invitation starts
 * here — and it is why the slug lives on a global index rather than being found
 * by scanning.
 *
 * Slugs are lowercased on the way in because a published slug is immutable
 * (`CLAUDE.md` §2.9) and case-sensitivity would make `/i/Ravi-Priya` and
 * `/i/ravi-priya` two different invitations, one of which 404s for a third of
 * the guest list.
 */
export const slugGsi1Pk = (slug: string) => `SLUG#${slug.toLowerCase()}` as const;
export const SLUG_GSI1_SK = "EVENT" as const;

export const emailGsi1Pk = (email: string) => `EMAIL#${email.toLowerCase()}` as const;
export const EMAIL_GSI1_SK = "USER" as const;

export const SHOWCASE_GSI1_PK = "SHOWCASE" as const;

/* -------------------------------------------------------------------- GSI2 */

/** A host's invitations, newest first when queried backwards. */
export const ownerGsi2Pk = (ownerId: string) => `USER#${ownerId}` as const;
export const ownerGsi2Sk = (createdAt: string) => `EVENT#${createdAt}` as const;

/** A partner's referred invitations. */
export const agentGsi2Pk = (agentId: string) => `AGENT#${agentId}` as const;

export const FEATURE_GSI2_PK = "FEATURE" as const;

/**
 * The leaderboard sort key. Vote counts are zero-padded to six digits so that
 * lexicographic ordering matches numeric ordering — without padding, "9" sorts
 * after "10" and the leaderboard is quietly wrong at exactly the point it
 * starts to matter.
 *
 * Rewritten on every vote, which is affordable because votes are rare and the
 * alternative is scanning the whole feature list to sort it.
 */
export const featureVotesGsi2Sk = (votes: number, id: string) =>
  `VOTES#${String(Math.max(0, Math.trunc(votes))).padStart(6, "0")}#${id}` as const;

/* ------------------------------------------------------------------ shared */

/** UTC date stamp used by every counter item. */
export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
