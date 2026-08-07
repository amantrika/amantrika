"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ASSET_BUCKET } from "@/lib/invite";
import type { AssetKind } from "@/lib/supabase/types";

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

  if (error || !data) return { ok: false, error: "Couldn't save that photo." };

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
