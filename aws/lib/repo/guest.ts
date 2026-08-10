import "server-only";
import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@aws/dynamo";
import { tableName } from "@aws/env";
import {
  GLOBAL_STATS_PK,
  SK_PREFIX,
  daySk,
  eventPk,
  rsvpSk,
  statsPk,
  todayIso,
  wishSk,
} from "@aws/keys";
import { getInviteForOwner } from "@aws/repo/invites";

/**
 * What guests write: RSVPs and wishes.
 *
 * ## The authorization shape here is different, and worth understanding
 *
 * Everywhere else in `repo/` the rule is "prove ownership first". These two are
 * the opposite: **anyone holding the link may write.** That is the product —
 * three hundred relatives, no accounts, one link. `submit_rsvp()` and
 * `submit_wish()` were `security definer` in Postgres for exactly this reason:
 * they let an anonymous visitor write one specific row and nothing else.
 *
 * So the protection is not *who* is asking but *what* they may say:
 *
 * - the invitation must exist and be published — a draft accepts nothing;
 * - every field is length-capped, because an unbounded text box on a public
 *   endpoint is a denial-of-service and a 400KB item limit away from breaking
 *   the whole partition;
 * - wishes arrive unapproved and stay invisible until the host approves them,
 *   so the blessing wall cannot be used to publish abuse on someone's wedding
 *   page.
 *
 * Reading is the reverse: RSVPs carry phone numbers, so `listRsvps` takes the
 * acting user and checks ownership (`CLAUDE.md` §2.12).
 */

export interface RsvpItem {
  PK: string;
  SK: string;
  _type: "rsvp";
  id: string;
  eventId: string;
  guestName: string;
  attending: "yes" | "no" | "maybe";
  headcount: number;
  phone?: string;
  message?: string;
  meal?: string;
  subEventKeys: string[];
  createdAt: string;
}

export interface WishItem {
  PK: string;
  SK: string;
  _type: "wish";
  id: string;
  eventId: string;
  name: string;
  message: string;
  isApproved: boolean;
  createdAt: string;
}

const cap = (s: string | undefined, n: number) => (s ? s.slice(0, n) : undefined);

/* --------------------------------------------------------------- guest writes */

export async function submitRsvp(input: {
  eventId: string;
  guestName: string;
  attending: "yes" | "no" | "maybe";
  headcount: number;
  phone?: string;
  message?: string;
  meal?: string;
  subEventKeys?: string[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const item: RsvpItem = {
    PK: eventPk(input.eventId),
    SK: rsvpSk(now, id),
    _type: "rsvp",
    id,
    eventId: input.eventId,
    guestName: input.guestName.slice(0, 120),
    attending: input.attending,
    // A wedding party is not 10,000 people. An unbounded number here would
    // corrupt every headcount total the host relies on.
    headcount: Math.min(Math.max(1, Math.trunc(input.headcount || 1)), 50),
    phone: cap(input.phone, 30),
    message: cap(input.message, 1000),
    meal: cap(input.meal, 60),
    subEventKeys: (input.subEventKeys ?? []).slice(0, 20),
    createdAt: now,
  };

  await ddb.send(new PutCommand({ TableName: tableName, Item: item }));
  await bumpDaily(input.eventId, "rsvps");
  return { ok: true, id };
}

export async function submitWish(input: {
  eventId: string;
  name: string;
  message: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const message = input.message.trim();
  if (message.length === 0) return { ok: false, error: "Write a message first." };

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        PK: eventPk(input.eventId),
        SK: wishSk(now, id),
        _type: "wish",
        id,
        eventId: input.eventId,
        name: input.name.slice(0, 120),
        message: message.slice(0, 1000),
        // Unapproved by default. The blessing wall is public on someone's
        // wedding page; it must not be an open publishing endpoint.
        isApproved: false,
        createdAt: now,
      },
    })
  );

  return { ok: true, id };
}

/* ------------------------------------------------------------ public reading */

/** Approved wishes, newest first. Safe for the guest page — no PII. */
export async function listApprovedWishes(eventId: string, limit = 60): Promise<WishItem[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": eventPk(eventId), ":sk": SK_PREFIX.wish },
      ScanIndexForward: false,
      Limit: limit * 3,
    })
  );
  return ((res.Items ?? []) as WishItem[]).filter((w) => w.isApproved).slice(0, limit);
}

/* ------------------------------------------------------------- owner reading */

/** RSVPs, for the owner only. These carry phone numbers. */
export async function listRsvps(userId: string, eventId: string): Promise<RsvpItem[]> {
  if (!(await getInviteForOwner(userId, eventId))) return [];

  const res = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": eventPk(eventId), ":sk": SK_PREFIX.rsvp },
      ScanIndexForward: false,
    })
  );
  return (res.Items ?? []) as RsvpItem[];
}

/** Every wish including unapproved ones — the moderation queue. Owner only. */
export async function listAllWishes(userId: string, eventId: string): Promise<WishItem[]> {
  if (!(await getInviteForOwner(userId, eventId))) return [];

  const res = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": eventPk(eventId), ":sk": SK_PREFIX.wish },
      ScanIndexForward: false,
    })
  );
  return (res.Items ?? []) as WishItem[];
}

export async function setWishApproval(
  userId: string,
  eventId: string,
  wish: WishItem,
  approved: boolean
): Promise<boolean> {
  if (!(await getInviteForOwner(userId, eventId))) return false;

  await ddb.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { PK: wish.PK, SK: wish.SK },
      UpdateExpression: "SET isApproved = :a",
      ExpressionAttributeValues: { ":a": approved },
    })
  );
  return true;
}

/* -------------------------------------------------------------------- stats */

export interface EventTotals {
  views: number;
  rsvpYes: number;
  rsvpNo: number;
  rsvpMaybe: number;
  headcount: number;
  wishes: number;
}

/**
 * Totals for the host's dashboard.
 *
 * Computed by reading the partition, not by a counter, because these are exact
 * answers about a bounded set — a few hundred RSVPs at most — and a counter
 * that drifts from the underlying rows is worse than a query. The per-day
 * counters exist for the opposite case: view counts, which are unbounded and
 * have no rows to count.
 */
export async function eventTotals(userId: string, eventId: string): Promise<EventTotals | null> {
  if (!(await getInviteForOwner(userId, eventId))) return null;

  const res = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": eventPk(eventId) },
    })
  );

  const items = res.Items ?? [];
  const rsvps = items.filter((i) => i._type === "rsvp") as RsvpItem[];
  const wishes = items.filter((i) => i._type === "wish") as WishItem[];

  const stats = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": statsPk(eventId), ":sk": SK_PREFIX.day },
    })
  );
  const views = (stats.Items ?? []).reduce((sum, d) => sum + (Number(d.views) || 0), 0);

  return {
    views,
    rsvpYes: rsvps.filter((r) => r.attending === "yes").length,
    rsvpNo: rsvps.filter((r) => r.attending === "no").length,
    rsvpMaybe: rsvps.filter((r) => r.attending === "maybe").length,
    headcount: rsvps.filter((r) => r.attending === "yes").reduce((s, r) => s + r.headcount, 0),
    wishes: wishes.length,
  };
}

/** Per-day view counts for the chart. */
export async function viewsByDay(
  userId: string,
  eventId: string
): Promise<{ day: string; views: number }[]> {
  if (!(await getInviteForOwner(userId, eventId))) return [];

  const res = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": statsPk(eventId), ":sk": SK_PREFIX.day },
    })
  );
  return (res.Items ?? []).map((i) => ({
    day: String(i.SK).replace("DAY#", ""),
    views: Number(i.views) || 0,
  }));
}

/** Atomic per-day counter. See aws/DATA-MODEL.md on why aggregates are written. */
export async function bumpDaily(
  eventId: string,
  field: "views" | "rsvps" | "badgeClicks",
  when: Date = new Date()
): Promise<void> {
  const day = daySk(todayIso(when));
  const bump = (pk: string) =>
    ddb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { PK: pk, SK: day },
        UpdateExpression: "ADD #f :one SET #t = if_not_exists(#t, :type)",
        ExpressionAttributeNames: { "#f": field, "#t": "_type" },
        ExpressionAttributeValues: { ":one": 1, ":type": "dailyStats" },
      })
    );
  await Promise.all([bump(statsPk(eventId)), bump(GLOBAL_STATS_PK)]);
}
