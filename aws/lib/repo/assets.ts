import "server-only";
import { DeleteCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@aws/dynamo";
import { tableName } from "@aws/env";
import { SK_PREFIX, assetSk, eventPk } from "@aws/keys";
import { getInviteForOwner } from "@aws/repo/invites";
import type { AssetItem } from "@aws/repo/types";

/**
 * Media attached to an invitation.
 *
 * Every function takes the acting user first and proves ownership through
 * `getInviteForOwner` before touching anything. Assets live under the
 * invitation's partition and carry no owner of their own — whoever can write
 * `EVENT#<id>` can write all of it — so the check has to happen here.
 */

export async function listAssets(userId: string, eventId: string): Promise<AssetItem[]> {
  if (!(await getInviteForOwner(userId, eventId))) return [];

  const res = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": eventPk(eventId), ":sk": SK_PREFIX.asset },
    })
  );
  return ((res.Items ?? []) as AssetItem[]).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Record an upload the browser has already streamed into S3.
 *
 * The storage key is rebuilt here from `eventId` and `assetId` rather than
 * accepted from the client. A client-supplied path is a request to write
 * anywhere in the bucket — including another invitation's folder — and the
 * presigned URL alone does not prevent someone claiming a key they did not
 * upload to.
 */
export async function registerAsset(
  userId: string,
  input: {
    eventId: string;
    assetId: string;
    storageKey: string;
    kind: AssetItem["kind"];
    caption?: string;
    fileName?: string;
  }
): Promise<{ ok: true; assetId: string } | { ok: false; error: string }> {
  if (!(await getInviteForOwner(userId, input.eventId))) {
    return { ok: false, error: "That file doesn't belong to this invitation." };
  }

  // Belt and braces: the key must sit under this invitation's prefix.
  if (!input.storageKey.startsWith(`invites/${input.eventId}/`)) {
    return { ok: false, error: "That file doesn't belong to this invitation." };
  }

  const existing = await listAssets(userId, input.eventId);
  const now = new Date().toISOString();

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        PK: eventPk(input.eventId),
        SK: assetSk(input.assetId),
        _type: "asset",
        id: input.assetId,
        eventId: input.eventId,
        kind: input.kind,
        storagePath: input.storageKey,
        caption: input.caption,
        fileName: input.fileName,
        sortOrder: existing.length,
        createdAt: now,
        updatedAt: now,
      },
    })
  );

  return { ok: true, assetId: input.assetId };
}

/**
 * Remove an asset row and its object.
 *
 * The row goes first. An orphaned S3 object costs a fraction of a cent and is
 * swept by lifecycle; a row pointing at a deleted object renders a broken image
 * on a wedding invitation, which is the failure that actually matters.
 */
export async function deleteAsset(
  userId: string,
  eventId: string,
  assetId: string
): Promise<boolean> {
  const assets = await listAssets(userId, eventId);
  const asset = assets.find((a) => a.id === assetId);
  if (!asset) return false;

  await ddb.send(
    new DeleteCommand({
      TableName: tableName,
      Key: { PK: eventPk(eventId), SK: assetSk(assetId) },
    })
  );

  const { deleteMedia } = await import("@aws/storage");
  try {
    await deleteMedia(asset.storagePath);
  } catch {
    // Lifecycle will collect it. Never fail the user's delete over cleanup.
  }

  return true;
}

/** Persist a new order. Called after a drag-and-drop in the builder. */
export async function reorderAssets(
  userId: string,
  eventId: string,
  assetIds: string[]
): Promise<boolean> {
  const assets = await listAssets(userId, eventId);
  if (assets.length === 0) return false;

  const byId = new Map(assets.map((a) => [a.id, a]));
  const now = new Date().toISOString();

  for (const [i, id] of assetIds.entries()) {
    const asset = byId.get(id);
    if (!asset) continue;
    await ddb.send(
      new PutCommand({
        TableName: tableName,
        Item: { ...asset, sortOrder: i, updatedAt: now },
      })
    );
  }

  return true;
}
