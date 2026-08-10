import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { awsRegion } from "@aws/env";

/**
 * S3 media storage.
 *
 * ## The key layout
 *
 * ```
 * invites/<eventId>/photos/<assetId>.<ext>      gallery and story images
 * invites/<eventId>/video/<assetId>.<ext>       reels, highlight films
 * invites/<eventId>/audio/<assetId>.<ext>       background music
 * invites/<eventId>/documents/<assetId>.<ext>   menus, maps, itineraries
 * themes/<themeId>/<name>.<ext>                 catalogue art, not user content
 * ```
 *
 * Everything for one invitation lives under one prefix. That is not tidiness —
 * it is what makes deleting an invitation a single prefix delete rather than a
 * hunt, and what lets a lifecycle rule or a cost report target user media
 * without touching catalogue art.
 *
 * **The asset id is the filename.** The name the host uploaded is never used as
 * a key: it can contain slashes, unicode, `../`, or simply collide with another
 * host's `IMG_0001.jpg`. The original name is kept as metadata for display.
 *
 * ## Nothing here is public
 *
 * The bucket blocks all public access. Objects are read through CloudFront with
 * an Origin Access Control, and written through short-lived presigned URLs. A
 * public bucket would be both a data leak — guest photographs are private — and
 * an unbounded egress bill.
 */

const client = new S3Client({ region: awsRegion, maxAttempts: 3 });

export const MEDIA_BUCKET = process.env.AMANTRIKA_MEDIA_BUCKET ?? "amantrika-media";

/**
 * Public base for reading. Empty until CloudFront exists, and callers must cope
 * — `mediaUrl()` returns an S3 URL in that case, which works for signed-in
 * tooling and is deliberately not something to ship to guests.
 */
export const MEDIA_CDN = process.env.AMANTRIKA_MEDIA_CDN ?? "";

export type MediaKind = "photos" | "video" | "audio" | "documents";

/** Which folder a content type belongs in. */
export function kindFor(contentType: string): MediaKind {
  if (contentType.startsWith("image/")) return "photos";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  return "documents";
}

/**
 * What may be uploaded, by content type.
 *
 * An allow-list, not a deny-list: a deny-list admits every format invented
 * after it was written, and "upload a photo" must not become "host arbitrary
 * files on our domain".
 */
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "application/pdf": "pdf",
};

/** 25MB for images, matching the builder's own copy; 200MB for video. */
const MAX_BYTES: Record<MediaKind, number> = {
  photos: 25 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
  documents: 25 * 1024 * 1024,
};

export function mediaKey(eventId: string, assetId: string, contentType: string): string {
  const ext = ALLOWED[contentType] ?? "bin";
  return `invites/${eventId}/${kindFor(contentType)}/${assetId}.${ext}`;
}

/** The prefix holding everything for one invitation. */
export const invitePrefix = (eventId: string) => `invites/${eventId}/`;

/**
 * A URL a guest's browser can read.
 *
 * The stored value is always a *key*, never a URL — the same indirection the
 * `atheme` rows use for Cloudinary. Moving CDN is then an environment variable
 * rather than an UPDATE over every row.
 */
export function mediaUrl(key: string): string {
  if (MEDIA_CDN) return `${MEDIA_CDN.replace(/\/$/, "")}/${key}`;
  return `https://${MEDIA_BUCKET}.s3.${awsRegion}.amazonaws.com/${key}`;
}

export interface UploadTicket {
  /** PUT the file here, with the same Content-Type. */
  url: string;
  /** Store this, not the URL. */
  key: string;
  assetId: string;
  expiresIn: number;
}

/**
 * Mint a short-lived upload URL.
 *
 * The browser uploads straight to S3, so a 200MB video never passes through a
 * Lambda — which would be slow, would count against the request payload limit,
 * and would be billed as compute for what is really a network transfer.
 *
 * **The caller must have already checked that this user owns `eventId`.** This
 * function cannot: it takes an id, not a session. Every caller goes through a
 * repository ownership check first — the same discipline the rest of `repo/`
 * follows, and the same failure mode if it is skipped.
 */
export async function createUploadTicket(input: {
  eventId: string;
  contentType: string;
  sizeBytes: number;
  originalName?: string;
}): Promise<{ ok: true; ticket: UploadTicket } | { ok: false; error: string }> {
  const ext = ALLOWED[input.contentType];
  if (!ext) return { ok: false, error: "That file type isn't supported." };

  const kind = kindFor(input.contentType);
  if (input.sizeBytes > MAX_BYTES[kind]) {
    return {
      ok: false,
      error: `That file is too large — the limit is ${Math.round(MAX_BYTES[kind] / 1024 / 1024)}MB.`,
    };
  }

  const assetId = crypto.randomUUID();
  const key = mediaKey(input.eventId, assetId, input.contentType);

  const url = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: key,
      ContentType: input.contentType,
      // Enforced by S3 at upload time, so a client that lies about `sizeBytes`
      // still cannot write a larger object than we agreed to.
      ContentLength: input.sizeBytes,
      Metadata: input.originalName
        ? // Header-safe: metadata values must be ASCII, and Indian filenames
          // frequently are not.
          { "original-name": encodeURIComponent(input.originalName).slice(0, 200) }
        : undefined,
    }),
    { expiresIn: 300 }
  );

  return { ok: true, ticket: { url, key, assetId, expiresIn: 300 } };
}

export async function deleteMedia(key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: MEDIA_BUCKET, Key: key }));
}

/**
 * A short-lived signed URL for reading one object.
 *
 * One hour: long enough that a guest scrolling an invitation never sees a link
 * expire mid-page, short enough that a URL copied out of the network tab is not
 * a permanent handle on someone's wedding photographs.
 */
export async function presignedMediaUrl(key: string): Promise<string> {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: MEDIA_BUCKET, Key: key }), {
    expiresIn: 3600,
  });
}
