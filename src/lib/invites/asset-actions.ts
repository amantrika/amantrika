"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ASSET_BUCKET } from "@/lib/invites/invite";
import { requireProfile } from "@/lib/auth";
import { captureServer } from "@/lib/posthog/server";
import { log } from "@/lib/posthog/logger";
import { EVENTS } from "@/lib/posthog/events";
import type { AssetKind } from "@/lib/supabase/types";
import { authProviderName } from "@/lib/auth/provider";

export interface AssetResult {
  ok: boolean;
  error?: string;
  assetId?: string;
}

const registerSchema = z.object({
  eventId: z.string().uuid(),
  storagePath: z.string().min(1).max(400),
  kind: z.enum(["photo", "audio", "video", "logo", "document"]),
  fileName: z.string().max(260).optional(),
  mimeType: z.string().max(120).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  caption: z.string().trim().max(200).optional(),
});

/**
 * Records an upload that the browser has already streamed into Storage.
 * The storage policy proved the caller may write to this event's folder;
 * we re-check the prefix here so a forged path can't attach to another event.
 */
export async function registerAsset(input: z.input<typeof registerSchema>): Promise<AssetResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That upload looked malformed." };
  const a = parsed.data;

  if (authProviderName() === "cognito") {
    const profile = await requireProfile();
    const { registerAsset: register } = await import("@/lib/aws/repo/assets");
    // On S3 the key is `invites/<eventId>/<kind>/<assetId>.<ext>`, so the asset
    // id is the filename — the uploader already knows it from the ticket.
    const assetId = a.storagePath.split("/").pop()?.split(".")[0] ?? crypto.randomUUID();
    const result = await register(profile.id, {
      eventId: a.eventId,
      assetId,
      storageKey: a.storagePath,
      kind: a.kind === "photo" ? "photo" : a.kind === "video" ? "video" : "document",
      caption: a.caption,
      fileName: a.fileName,
    });
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/dashboard");
    return { ok: true, assetId: result.assetId };
  }

  if (!a.storagePath.startsWith(`${a.eventId}/`)) {
    return { ok: false, error: "That file doesn't belong to this invitation." };
  }


  const supabase = await createClient();

  const { count } = await supabase
    .from("assets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", a.eventId);

  const { data, error } = await supabase
    .from("assets")
    .insert({
      event_id: a.eventId,
      kind: a.kind as AssetKind,
      storage_path: a.storagePath,
      file_name: a.fileName ?? null,
      mime_type: a.mimeType ?? null,
      size_bytes: a.sizeBytes ?? null,
      width: a.width ?? null,
      height: a.height ?? null,
      caption: a.caption ?? null,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    log.error("asset row insert failed", {
      event_id: a.eventId,
      kind: a.kind,
      reason: error?.message,
    });
    return { ok: false, error: "Couldn't save that photo." };
  }

  const profile = await requireProfile();
  // Filenames can carry real names, so only shape and size are recorded.
  await captureServer(profile.id, EVENTS.asset_uploaded, {
    event_id: a.eventId,
    kind: a.kind,
    mime_type: a.mimeType,
    size_kb: a.sizeBytes ? Math.round(a.sizeBytes / 1024) : undefined,
    width: a.width,
    height: a.height,
    asset_index: count ?? 0,
  });

  revalidatePath("/dashboard");
  return { ok: true, assetId: data.id };
}

export async function deleteAsset(assetId: string): Promise<AssetResult> {
  if (!z.string().uuid().safeParse(assetId).success) {
    return { ok: false, error: "Unknown photo." };
  }

  const supabase = await createClient();
  const { data: asset } = await supabase
    .from("assets")
    .select("storage_path")
    .eq("id", assetId)
    .maybeSingle();

  if (!asset) return { ok: false, error: "That photo is already gone." };

  // Remove the row first: RLS is the authority on whether this is allowed.
  const { error } = await supabase.from("assets").delete().eq("id", assetId);
  if (error) return { ok: false, error: "Couldn't remove that photo." };

  await supabase.storage.from(ASSET_BUCKET).remove([asset.storage_path]);

  revalidatePath("/dashboard");
  return { ok: true };
}

/** Persists drag-to-reorder. Accepts the full ordered list of asset ids. */
export async function reorderAssets(eventId: string, assetIds: string[]): Promise<AssetResult> {
  if (!z.string().uuid().safeParse(eventId).success) return { ok: false, error: "Unknown event." };

  const supabase = await createClient();
  const updates = assetIds.map((id, i) =>
    supabase.from("assets").update({ sort_order: i }).eq("id", id).eq("event_id", eventId)
  );
  const results = await Promise.all(updates);

  if (results.some((r) => r.error)) return { ok: false, error: "Couldn't save the new order." };

  revalidatePath("/dashboard");
  return { ok: true };
}
