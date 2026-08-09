/**
 * Copy invitations out of Supabase and into DynamoDB.
 *
 *   npx tsx --conditions=react-server scripts/aws-seed.ts          # dry run
 *   npx tsx --conditions=react-server scripts/aws-seed.ts --write  # actually write
 *
 * Idempotent: every item is written by its deterministic key, so running it
 * twice produces the same table rather than duplicates. That matters because
 * this will be run repeatedly during the migration, not once at the end.
 *
 * It reads Supabase with the service-role key, which bypasses RLS — correct
 * here, because a migration must see every row regardless of who owns it, and
 * this runs on your machine and never in the app (CLAUDE.md §2.7 permits
 * `scripts/`).
 *
 * **This is a copy, not a move.** Supabase is left untouched, so the switch back
 * is always available.
 */
import { createClient } from "@supabase/supabase-js";
import { BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../src/lib/aws/dynamo";
import { tableName } from "../src/lib/aws/env";
import {
  META_SK,
  assetSk,
  eventPk,
  ownerGsi2Pk,
  ownerGsi2Sk,
  slugGsi1Pk,
  SLUG_GSI1_SK,
  subEventSk,
} from "../src/lib/aws/keys";

const WRITE = process.argv.includes("--write");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/** DynamoDB rejects batches over 25 items. */
async function writeAll(items: Record<string, unknown>[]) {
  if (!WRITE) return;
  for (let i = 0; i < items.length; i += 25) {
    await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: items.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } })),
        },
      })
    );
  }
}

async function main() {
  console.log(WRITE ? "WRITING to DynamoDB\n" : "DRY RUN — pass --write to commit\n");

  const { data: events, error } = await supabase.from("events").select("*");
  if (error) throw new Error(`reading events: ${error.message}`);

  const items: Record<string, unknown>[] = [];
  let subEventCount = 0;
  let assetCount = 0;

  for (const e of events ?? []) {
    const now = new Date().toISOString();

    items.push({
      PK: eventPk(e.id),
      SK: META_SK,
      _type: "invite",
      id: e.id,
      ownerId: e.owner_id,
      agentId: e.agent_id ?? undefined,
      slug: e.slug,
      status: e.status,
      title: e.title,
      eventType: e.event_type,
      themeId: e.theme_id,
      city: e.city ?? undefined,
      timezone: e.timezone,
      mainDateTime: e.main_datetime ?? undefined,
      hashtag: e.hashtag ?? undefined,
      story: e.story ?? undefined,
      coverAssetId: e.cover_asset_id ?? undefined,
      hosts: e.hosts ?? [],
      hotels: e.hotels ?? [],
      storyMoments: e.story_moments ?? [],
      settings: e.settings ?? {},
      permissions: e.permissions ?? {},
      planCode: e.plan_code,
      publishedAt: e.published_at ?? undefined,
      isShowcased: e.is_showcased,
      showcaseTags: e.showcase_tags ?? [],
      showcasedAt: e.showcased_at ?? undefined,
      showcaseSourceId: e.showcase_source_id ?? undefined,
      createdAt: e.created_at ?? now,
      updatedAt: e.updated_at ?? now,
      GSI1PK: slugGsi1Pk(e.slug),
      GSI1SK: SLUG_GSI1_SK,
      GSI2PK: ownerGsi2Pk(e.owner_id),
      GSI2SK: ownerGsi2Sk(e.created_at ?? now),
    });

    const [{ data: subs }, { data: assets }] = await Promise.all([
      supabase.from("sub_events").select("*").eq("event_id", e.id).order("sort_order"),
      supabase.from("assets").select("*").eq("event_id", e.id).order("sort_order"),
    ]);

    for (const s of subs ?? []) {
      subEventCount++;
      items.push({
        PK: eventPk(e.id),
        // A sub-event with no start time would key as "SUBEVENT#undefined#…" and
        // sort into a heap at the top. Fall back to the event's own date so the
        // ordering stays sane rather than merely legal.
        SK: subEventSk(s.starts_at ?? e.main_datetime ?? e.created_at, s.id),
        _type: "subEvent",
        id: s.id,
        eventId: e.id,
        key: s.key,
        name: s.name,
        startsAt: s.starts_at ?? undefined,
        timeLabel: s.time_label ?? undefined,
        venue: s.venue ?? undefined,
        address: s.address ?? undefined,
        dressCode: s.dress_code ?? undefined,
        mapUrl: s.map_url ?? undefined,
        sortOrder: s.sort_order ?? 0,
        createdAt: s.created_at ?? new Date().toISOString(),
        updatedAt: s.created_at ?? new Date().toISOString(),
      });
    }

    for (const a of assets ?? []) {
      assetCount++;
      items.push({
        PK: eventPk(e.id),
        SK: assetSk(a.id),
        _type: "asset",
        id: a.id,
        eventId: e.id,
        kind: a.kind,
        storagePath: a.storage_path,
        caption: a.caption ?? undefined,
        sortOrder: a.sort_order ?? 0,
        createdAt: a.created_at ?? new Date().toISOString(),
        updatedAt: a.created_at ?? new Date().toISOString(),
      });
    }

    console.log(
      `  ${e.status.padEnd(9)} ${e.slug.padEnd(34)} ${(subs ?? []).length} sub-events, ${(assets ?? []).length} assets`
    );
  }

  await writeAll(items);

  console.log(
    `\n${events?.length ?? 0} invitations, ${subEventCount} sub-events, ${assetCount} assets` +
      ` → ${items.length} items ${WRITE ? "written" : "prepared"}.`
  );
  if (!WRITE) console.log("Nothing was written. Re-run with --write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
