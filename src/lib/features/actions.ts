"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfile, requireProfile, requireRole } from "@/lib/auth";
import { captureServer, captureAnonymousServer } from "@/lib/posthog/server";
import { log } from "@/lib/posthog/logger";
import { EVENTS } from "@/lib/posthog/events";
import type { FeatureStatus } from "./types";

export interface FeatureResult {
  ok: boolean;
  error?: string;
  notice?: string;
  votes?: number;
}

/**
 * Stable pseudonymous identifier for a voter.
 *
 * Deliberately *not* the daily-rotating hash used for view counting: that
 * rotates, which would let the same person vote again every day. This one is
 * salted and one-way — it carries no address and cannot be reversed — but is
 * stable, which is what "one vote per person" actually requires.
 *
 * A shared office or carrier NAT means several people can share one identity.
 * That is the accepted cost of not making people sign in to express a
 * preference; the leaderboard, which does need identity, uses accounts instead.
 */
async function voterHash(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
  return createHash("sha256").update(`${ip}|amantrika-feature-vote`).digest("hex").slice(0, 40);
}

/* ------------------------------------------------------------------ voting */

export async function voteForFeature(requestId: string): Promise<FeatureResult> {
  if (!z.string().uuid().safeParse(requestId).success) {
    return { ok: false, error: "Unknown request." };
  }

  const supabase = await createClient();
  const hash = await voterHash();

  const { data, error } = await supabase.rpc("cast_feature_vote", {
    p_request_id: requestId,
    p_voter_hash: hash,
  });

  if (error) {
    log.warn("feature vote failed", { request_id: requestId, reason: error.message });
    return { ok: false, error: "Couldn't record that vote." };
  }

  // -1 means the request is decided, so voting has closed.
  if (data === -1) {
    return { ok: false, error: "Voting has closed — this one has already been decided." };
  }

  await captureAnonymousServer(hash, EVENTS.feature_voted, { request_id: requestId });

  revalidatePath("/roadmap");
  return { ok: true, votes: data as number };
}

/** Which requests this visitor has already voted on, so the UI can mark them. */
export async function myVotedRequestIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_feature_votes", { p_voter_hash: await voterHash() });
  return ((data ?? []) as { request_id?: string }[] | string[]).map((r) =>
    typeof r === "string" ? r : (r.request_id ?? "")
  ).filter(Boolean);
}

/* --------------------------------------------------------------- proposing */

const proposalSchema = z.object({
  title: z.string().trim().min(4, "Give it a short title.").max(120),
  body: z.string().trim().max(2000).optional(),
});

/**
 * Proposing requires an account — an unauthenticated submit box on a public
 * page is a spam target, and a proposal is something we may need to reply to.
 */
export async function proposeFeature(input: z.input<typeof proposalSchema>): Promise<FeatureResult> {
  const parsed = proposalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const profile = await requireProfile("/roadmap");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("feature_requests")
    .insert({
      author_id: profile.id,
      title: parsed.data.title,
      body: parsed.data.body || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    log.error("feature proposal failed", { reason: error?.message });
    return { ok: false, error: "Couldn't post that idea." };
  }

  // The author's own vote is implied — they clearly want it.
  await supabase.rpc("cast_feature_vote", {
    p_request_id: data.id,
    p_voter_hash: await voterHash(),
  });

  await captureServer(profile.id, EVENTS.feature_proposed, { has_detail: Boolean(parsed.data.body) });

  revalidatePath("/roadmap");
  return { ok: true, notice: "Posted. Others can vote on it now." };
}

/* ------------------------------------------------------------------- admin */

const statusSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["open", "planned", "building", "shipped", "declined"]),
  note: z.string().trim().max(500).optional(),
});

/**
 * Admin-only. Moving a request off `open` closes its voting — continuing to
 * gather signal on something already decided is noise, and the board should
 * show a settled decision rather than a live contest.
 */
export async function setFeatureStatus(input: z.input<typeof statusSchema>): Promise<FeatureResult> {
  const admin = await requireRole(["admin"], "/admin");
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check that request." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("feature_requests")
    .update({
      status: parsed.data.status as FeatureStatus,
      status_note: parsed.data.note ?? null,
      decided_at: parsed.data.status === "open" ? null : new Date().toISOString(),
    })
    .eq("id", parsed.data.requestId);

  if (error) {
    log.error("feature status change failed", { reason: error.message });
    return { ok: false, error: "Couldn't update that." };
  }

  await captureServer(admin.id, EVENTS.feature_status_changed, { status: parsed.data.status });

  revalidatePath("/roadmap");
  revalidatePath("/admin/requests");
  return { ok: true, notice: `Marked ${parsed.data.status}.` };
}

/** True when the viewer may propose — drives whether the form or a prompt shows. */
export async function canPropose(): Promise<boolean> {
  return Boolean(await getProfile());
}
