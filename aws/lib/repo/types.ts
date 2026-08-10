import "server-only";

/**
 * The stored shapes.
 *
 * These are hand-written, and that is a real loss compared to what came before:
 * `types.generated.ts` was derived from the live Postgres schema, so a column
 * rename broke the build. DynamoDB has no schema to generate from, so nothing
 * checks that what is written here matches what is in the table.
 *
 * The mitigation is that **every write goes through a Zod parse** in the
 * repository, using the schemas in `src/lib/schemas/`. `CLAUDE.md` §2.8 said
 * invitation content is Zod-validated on every write and that the schema file,
 * not the database, is the source of truth. That rule was good advice under
 * Postgres. Here it is the only thing standing between us and malformed rows.
 */

/** Fields every item carries, for legibility when reading the raw table. */
interface BaseItem {
  PK: string;
  SK: string;
  /** Discriminator. Not used for querying — the keys do that — but invaluable
   *  when staring at a scan output trying to work out what something is. */
  _type: string;
  createdAt: string;
  updatedAt: string;
}

export type InviteStatus = "draft" | "published" | "paid" | "archived";

/**
 * An invitation. The `EVENT#<id> / META` item.
 *
 * Field names are camelCase here where Postgres had snake_case. That is a
 * deliberate break: there is no SQL layer left to match, and mapping between
 * the two conventions at every call site was a steady source of bugs in the
 * old code. The migration script does the translation once.
 */
export interface InviteItem extends BaseItem {
  _type: "invite";
  id: string;
  ownerId: string;
  agentId?: string;

  /** Immutable once published. See CLAUDE.md §2.9. */
  slug: string;
  status: InviteStatus;
  title: string;
  eventType: string;
  themeId: string;

  city?: string;
  timezone: string;
  mainDateTime?: string;
  hashtag?: string;
  story?: string;
  coverAssetId?: string;

  /** Validated by src/lib/schemas/invite-content.ts before it is written. */
  hosts: unknown;
  hotels: unknown;
  storyMoments: unknown;
  settings: unknown;
  permissions: unknown;

  planCode: string;
  publishedAt?: string;

  isShowcased: boolean;
  showcaseTags: string[];
  showcasedAt?: string;
  showcaseSourceId?: string;

  /** GSI1: slug lookup — the guest hot path. */
  GSI1PK: string;
  GSI1SK: string;
  /** GSI2: this host's invitations. */
  GSI2PK: string;
  GSI2SK: string;
}

export interface SubEventItem extends BaseItem {
  _type: "subEvent";
  id: string;
  eventId: string;
  /**
   * The stable per-event identifier ("haldi", "mehndi") that the timeline
   * components key on — NOT the row id. The Postgres mapper exposed `key` as
   * the view's `id`, and the components rely on it, so the same must happen
   * here. Getting this wrong is invisible until a theme animates the wrong
   * section.
   */
  key: string;
  name: string;
  startsAt?: string;
  /** Free text the host typed ("7:00 PM"); overrides the formatted time. */
  timeLabel?: string;
  venue?: string;
  address?: string;
  dressCode?: string;
  mapUrl?: string;
  sortOrder: number;
}

export interface RsvpItem extends BaseItem {
  _type: "rsvp";
  id: string;
  eventId: string;
  name: string;
  attending: boolean;
  headcount: number;
  /**
   * Guest PII. `CLAUDE.md` §2.12 forbids exposing this outside the owner's
   * authenticated dashboard — which is now enforced here in `repo/`, because
   * there is no RLS policy left to do it.
   */
  phone?: string;
  message?: string;
  subEventIds?: string[];
}

export interface AssetItem extends BaseItem {
  _type: "asset";
  id: string;
  eventId: string;
  kind: "photo" | "video" | "document";
  /**
   * Path within the media bucket, never a full URL — the same indirection the
   * `atheme` rows already use for Cloudinary. Storing the host would mean an
   * UPDATE over every row the day the CDN changes; storing the path means an
   * environment variable.
   */
  storagePath: string;
  caption?: string;
  /** The name the host uploaded, kept for display only — never used as a key. */
  fileName?: string;
  sortOrder: number;
}

export interface WishItem extends BaseItem {
  _type: "wish";
  id: string;
  eventId: string;
  name: string;
  message: string;
  approved: boolean;
}

export interface ProfileItem extends BaseItem {
  _type: "profile";
  /** The Cognito `sub`. Not an email — emails change, subs do not. */
  id: string;
  email: string;
  fullName?: string;
  role: "host" | "agent" | "admin";
  GSI1PK: string;
  GSI1SK: string;
}

/** Per-day counters. Aggregates must be maintained on write; see DATA-MODEL.md. */
export interface DailyStatsItem {
  PK: string;
  SK: string;
  _type: "dailyStats";
  views?: number;
  uniqueViews?: number;
  rsvps?: number;
  badgeClicks?: number;
}
