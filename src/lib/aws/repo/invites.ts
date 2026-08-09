import "server-only";
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws/dynamo";
import { tableName } from "@/lib/aws/env";
import {
  META_SK,
  SK_PREFIX,
  eventPk,
  ownerGsi2Pk,
  ownerGsi2Sk,
  slugGsi1Pk,
  SLUG_GSI1_SK,
  statsPk,
  daySk,
  todayIso,
  GLOBAL_STATS_PK,
} from "@/lib/aws/keys";
import type { InviteItem, InviteStatus, SubEventItem } from "@/lib/aws/repo/types";

/**
 * Invitations — reads and writes.
 *
 * ## The rule this file exists to enforce
 *
 * Supabase enforced ownership in the database with RLS keyed on `auth.uid()`.
 * DynamoDB cannot: the table grants all-or-nothing access to whatever IAM role
 * the code runs as, and it will happily return any partition you ask for.
 *
 * So authorization moved here, and it only works if it is airtight:
 *
 * - Anything returning owned data takes `userId` **first** and checks it.
 * - Guest-facing reads use `getPublishedInviteBySlug`, which refuses anything
 *   not published and strips fields a guest may not see.
 * - No caller anywhere builds a key or calls `ddb` directly.
 *
 * A missing `userId` check here is not a bug in one page. It is an
 * authorization hole for every caller at once.
 */

/* --------------------------------------------------------------- guest read */

/**
 * The public invitation read — the replacement for `get_public_invite()`.
 *
 * Two queries, both on partition keys: slug → id via GSI1, then the whole
 * `EVENT#<id>` partition in one call for the meta item and its children. That
 * is fewer round trips than the Supabase version made, which is why this route
 * should get faster.
 *
 * Returns null rather than throwing for anything a guest should not see, so a
 * caller cannot accidentally distinguish "unpublished" from "does not exist" —
 * that difference leaks the existence of drafts.
 */
export async function getPublishedInviteBySlug(slug: string): Promise<{
  invite: PublicInvite;
  subEvents: PublicSubEvent[];
} | null> {
  const found = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk AND GSI1SK = :sk",
      ExpressionAttributeValues: {
        ":pk": slugGsi1Pk(slug),
        ":sk": SLUG_GSI1_SK,
      },
      Limit: 1,
    })
  );

  const meta = found.Items?.[0] as InviteItem | undefined;
  if (!meta) return null;

  // A draft is not a 404 in the database, but it must be one to a guest.
  if (meta.status !== "published" && meta.status !== "paid") return null;

  const partition = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": eventPk(meta.id),
        ":sk": SK_PREFIX.subEvent,
      },
    })
  );

  const subEvents = ((partition.Items ?? []) as SubEventItem[]).map(toPublicSubEvent);

  return { invite: toPublicInvite(meta), subEvents };
}

/**
 * The guest-visible projection.
 *
 * Written as an explicit allow-list, not as "the item minus a few fields".
 * A deny-list silently leaks every field added later; an allow-list fails
 * closed, which is the only acceptable direction for a page served to 300
 * strangers.
 */
export interface PublicInvite {
  id: string;
  slug: string;
  title: string;
  eventType: string;
  themeId: string;
  city?: string;
  timezone: string;
  mainDateTime?: string;
  hashtag?: string;
  story?: string;
  coverAssetId?: string;
  hosts: unknown;
  hotels: unknown;
  storyMoments: unknown;
  settings: unknown;
  status: InviteStatus;
  publishedAt?: string;
}

export interface PublicSubEvent {
  id: string;
  name: string;
  startsAt: string;
  endsAt?: string;
  venueName?: string;
  venueAddress?: string;
  lat?: number;
  lng?: number;
  dressCode?: string;
  note?: string;
}

function toPublicInvite(item: InviteItem): PublicInvite {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    eventType: item.eventType,
    themeId: item.themeId,
    city: item.city,
    timezone: item.timezone,
    mainDateTime: item.mainDateTime,
    hashtag: item.hashtag,
    story: item.story,
    coverAssetId: item.coverAssetId,
    hosts: item.hosts,
    hotels: item.hotels,
    storyMoments: item.storyMoments,
    settings: item.settings,
    status: item.status,
    publishedAt: item.publishedAt,
  };
}

function toPublicSubEvent(item: SubEventItem): PublicSubEvent {
  return {
    id: item.id,
    name: item.name,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    venueName: item.venueName,
    venueAddress: item.venueAddress,
    lat: item.lat,
    lng: item.lng,
    dressCode: item.dressCode,
    note: item.note,
  };
}

/* --------------------------------------------------------------- owner reads */

/** Every invitation belonging to one host, newest first. */
export async function listInvitesForOwner(userId: string): Promise<InviteItem[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk AND begins_with(GSI2SK, :sk)",
      ExpressionAttributeValues: { ":pk": ownerGsi2Pk(userId), ":sk": "EVENT#" },
      // Newest first: the sort key embeds an ISO timestamp, so reverse
      // lexicographic order is reverse chronological order.
      ScanIndexForward: false,
    })
  );
  return (res.Items ?? []) as InviteItem[];
}

/**
 * One invitation, for its owner.
 *
 * Returns null when the caller does not own it — not a thrown "forbidden",
 * because the caller should render the same not-found page either way. Telling
 * an attacker that an id exists but is not theirs is information they did not
 * have before.
 */
export async function getInviteForOwner(
  userId: string,
  eventId: string
): Promise<InviteItem | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: tableName,
      Key: { PK: eventPk(eventId), SK: META_SK },
    })
  );
  const item = res.Item as InviteItem | undefined;
  if (!item) return null;
  if (item.ownerId !== userId) return null;
  return item;
}

/* -------------------------------------------------------------------- writes */

export interface CreateInviteInput {
  title: string;
  slug: string;
  eventType: string;
  themeId: string;
  timezone: string;
  planCode: string;
  agentId?: string;
}

/**
 * Create a draft invitation.
 *
 * The condition expression is the important part: it makes creation fail if the
 * item already exists, which is what stops two concurrent requests from both
 * "creating" the same invitation. Postgres gave us this with a primary key;
 * here it has to be asked for explicitly, and forgetting it produces a silent
 * overwrite rather than an error.
 */
export async function createInvite(
  userId: string,
  input: CreateInviteInput
): Promise<InviteItem> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const item: InviteItem = {
    PK: eventPk(id),
    SK: META_SK,
    _type: "invite",
    id,
    ownerId: userId,
    agentId: input.agentId,
    slug: input.slug.toLowerCase(),
    status: "draft",
    title: input.title,
    eventType: input.eventType,
    themeId: input.themeId,
    timezone: input.timezone,
    planCode: input.planCode,
    hosts: [],
    hotels: [],
    storyMoments: [],
    settings: {},
    permissions: {},
    isShowcased: false,
    showcaseTags: [],
    createdAt: now,
    updatedAt: now,
    GSI1PK: slugGsi1Pk(input.slug),
    GSI1SK: SLUG_GSI1_SK,
    GSI2PK: ownerGsi2Pk(userId),
    GSI2SK: ownerGsi2Sk(now),
  };

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );

  return item;
}

/**
 * Update fields on an invitation the caller owns.
 *
 * `slug` is deliberately absent from the accepted patch. A published slug is on
 * hundreds of WhatsApp messages (`CLAUDE.md` §2.9), and the cheapest way to
 * honour that is to make the field unreachable rather than to check a condition
 * every caller could forget.
 */
export type InvitePatch = Partial<
  Pick<
    InviteItem,
    | "title"
    | "eventType"
    | "themeId"
    | "city"
    | "timezone"
    | "mainDateTime"
    | "hashtag"
    | "story"
    | "coverAssetId"
    | "hosts"
    | "hotels"
    | "storyMoments"
    | "settings"
    | "permissions"
  >
>;

export async function updateInvite(
  userId: string,
  eventId: string,
  patch: InvitePatch
): Promise<boolean> {
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return true;

  const names: Record<string, string> = { "#owner": "ownerId", "#updatedAt": "updatedAt" };
  const values: Record<string, unknown> = {
    ":owner": userId,
    ":updatedAt": new Date().toISOString(),
  };
  const sets: string[] = ["#updatedAt = :updatedAt"];

  entries.forEach(([key, value], i) => {
    names[`#f${i}`] = key;
    values[`:v${i}`] = value;
    sets.push(`#f${i} = :v${i}`);
  });

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { PK: eventPk(eventId), SK: META_SK },
        UpdateExpression: `SET ${sets.join(", ")}`,
        // Ownership is checked by the database as part of the write, not by a
        // read-then-write in application code. A separate check would leave a
        // window where ownership changes between the two.
        ConditionExpression: "#owner = :owner",
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      })
    );
    return true;
  } catch (error) {
    if ((error as { name?: string }).name === "ConditionalCheckFailedException") return false;
    throw error;
  }
}

/* ------------------------------------------------------------------ counters */

/**
 * Record one page view.
 *
 * Two atomic `ADD`s — per-invitation and global. This is what replaces
 * `record_page_view()` plus the `group by` that used to build the admin daily
 * series. The aggregate cannot be computed later from raw rows, because there
 * are no raw rows: if a number is not counted here at write time, it does not
 * exist. See DATA-MODEL.md.
 *
 * Deliberately not awaited by callers on the render path — a counter is never
 * worth delaying a guest's page.
 */
export async function recordView(eventId: string, when: Date = new Date()): Promise<void> {
  const day = daySk(todayIso(when));
  const bump = (pk: string) =>
    ddb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { PK: pk, SK: day },
        UpdateExpression: "ADD #views :one SET #type = if_not_exists(#type, :t)",
        ExpressionAttributeNames: { "#views": "views", "#type": "_type" },
        ExpressionAttributeValues: { ":one": 1, ":t": "dailyStats" },
      })
    );

  await Promise.all([bump(statsPk(eventId)), bump(GLOBAL_STATS_PK)]);
}
