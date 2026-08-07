"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ASSET_BUCKET, assetUrl } from "@/lib/invite";
import { deleteAsset, registerAsset } from "@/lib/asset-actions";
import { Button } from "./Button";

export interface UploadedAsset {
  id: string;
  storagePath: string;
  caption?: string | null;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Uploads straight from the browser into the `event-assets` bucket, then records
 * the row server-side. Objects are keyed `<eventId>/<random>.<ext>` — the storage
 * policy reads that first segment to decide who may write.
 */
export function PhotoUploader({
  eventId,
  assets,
  onChange,
  className = "",
}: {
  eventId: string;
  assets: UploadedAsset[];
  onChange: (assets: UploadedAsset[]) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = Array.from(fileList);

    const rejected = files.find((f) => !ACCEPTED.includes(f.type) || f.size > MAX_BYTES);
    if (rejected) {
      setError(
        rejected.size > MAX_BYTES
          ? `${rejected.name} is larger than 25 MB.`
          : `${rejected.name} isn't a supported image.`
      );
      return;
    }

    setBusy(true);
    setError(null);
    setProgress({ done: 0, total: files.length });

    const supabase = createClient();
    const added: UploadedAsset[] = [];

    for (const [i, file] of files.entries()) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const storagePath = `${eventId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(ASSET_BUCKET)
        .upload(storagePath, file, { cacheControl: "31536000", upsert: false });

      if (uploadError) {
        setError(`Couldn't upload ${file.name}. ${uploadError.message}`);
        break;
      }

      const dimensions = await readDimensions(file);
      const result = await registerAsset({
        eventId,
        storagePath,
        kind: "photo",
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        ...dimensions,
      });

      if (!result.ok || !result.assetId) {
        // Roll back the orphaned object so Storage doesn't drift from the table.
        await supabase.storage.from(ASSET_BUCKET).remove([storagePath]);
        setError(result.error ?? `Couldn't save ${file.name}.`);
        break;
      }

      added.push({ id: result.assetId, storagePath });
      setProgress({ done: i + 1, total: files.length });
    }

    if (added.length) onChange([...assets, ...added]);
    setBusy(false);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(asset: UploadedAsset) {
    startTransition(async () => {
      const result = await deleteAsset(asset.id);
      if (result.ok) onChange(assets.filter((a) => a.id !== asset.id));
      else setError(result.error ?? "Couldn't remove that photo.");
    });
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-3">
        {assets.map((asset) => (
          <figure key={asset.id} className="group relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(asset.storagePath)}
              alt={asset.caption ?? "Uploaded photograph"}
              className="size-24 rounded-soft border border-ornate/50 object-cover"
            />
            <button
              type="button"
              onClick={() => remove(asset)}
              aria-label="Remove photo"
              className="absolute -right-2 -top-2 rounded-full border border-ornate bg-surface p-1.5 text-muted opacity-0 shadow-resting transition-opacity hover:text-primary focus-visible:opacity-100 group-hover:opacity-100 cursor-pointer"
            >
              <Trash2 className="size-3.5" />
            </button>
          </figure>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex size-24 flex-col items-center justify-center gap-1 rounded-soft border border-dashed border-ornate/60 text-muted transition-colors hover:border-ornate hover:text-primary disabled:opacity-50 cursor-pointer"
        >
          <ImagePlus className="size-5" />
          <span className="text-xs">Add</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="mt-3 flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-4" /> Upload photos
        </Button>
        {progress && (
          <span className="type-caption" role="status">
            Uploading {progress.done} of {progress.total}…
          </span>
        )}
      </div>

      <p className="mt-2 type-caption">JPG, PNG, WebP, AVIF or GIF · up to 25 MB each.</p>
      {error && (
        <p role="alert" className="mt-2 type-caption text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

/** Best-effort intrinsic size, so the invite can reserve layout space later. */
function readDimensions(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    img.src = url;
  });
}
