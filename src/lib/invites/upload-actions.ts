"use server";

import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { authProviderName } from "@/lib/auth/provider";

const ticketSchema = z.object({
  eventId: z.string().uuid(),
  contentType: z.string().min(3).max(120),
  sizeBytes: z.number().int().positive(),
  originalName: z.string().max(260).optional(),
});

export type UploadTicketResult =
  | { ok: true; url: string; key: string; assetId: string }
  | { ok: false; error: string };

/**
 * Mint a presigned S3 URL so the browser can upload directly.
 *
 * Ownership is proved here, before any URL exists — a presigned URL is a
 * capability, and handing one out is the same as granting a write. The storage
 * layer takes an id, not a session, so this is the only place that check can
 * live.
 *
 * AWS stack only. On Vercel the uploader writes to Supabase Storage, whose own
 * bucket policy does this job.
 */
export async function createUploadTicket(
  input: z.input<typeof ticketSchema>
): Promise<UploadTicketResult> {
  if (authProviderName() !== "cognito") {
    return { ok: false, error: "Direct uploads are only available on the AWS stack." };
  }

  const parsed = ticketSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That upload looked malformed." };

  const profile = await requireProfile();

  const { getInviteForOwner } = await import("@/lib/aws/repo/invites");
  if (!(await getInviteForOwner(profile.id, parsed.data.eventId))) {
    return { ok: false, error: "That invitation isn't yours." };
  }

  const { createUploadTicket: mint } = await import("@/lib/aws/storage");
  const result = await mint(parsed.data);
  if (!result.ok) return { ok: false, error: result.error };

  return {
    ok: true,
    url: result.ticket.url,
    key: result.ticket.key,
    assetId: result.ticket.assetId,
  };
}
