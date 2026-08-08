"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { captureServer } from "@/lib/posthog/server";
import { log } from "@/lib/posthog/logger";
import { EVENTS } from "@/lib/posthog/events";
import type { AgentStatus, EventStatus, UserRole } from "@/lib/supabase/types";

export interface AdminResult {
  ok: boolean;
  error?: string;
  notice?: string;
}

const uuid = z.string().uuid();

/**
 * Every action here re-checks the caller is an admin server-side. The nav being
 * hidden is not authorisation; RLS is the real boundary and this is the second.
 */
async function assertAdmin() {
  return requireRole(["admin"], "/admin", "/dashboard");
}

/* ------------------------------------------------------------------ people */

export async function setUserRole(profileId: string, role: UserRole): Promise<AdminResult> {
  const admin = await assertAdmin();
  if (!uuid.safeParse(profileId).success) return { ok: false, error: "Unknown account." };
  if (!["host", "agent", "admin"].includes(role)) return { ok: false, error: "Unknown role." };

  if (profileId === admin.id) {
    // Cheap footgun to close: demoting yourself could leave nobody able to admin.
    return { ok: false, error: "You can't change your own role." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);

  if (error) {
    // The admin_allowlist trigger raises for non-eligible addresses; surface
    // that plainly rather than as a generic failure.
    const isAllowlist = error.message.includes("not eligible for the admin role");
    log.warn("role change rejected", { profile_id: profileId, role, reason: error.message });
    return {
      ok: false,
      error: isAllowlist
        ? "That address isn't on the admin allowlist, so it can't be made an admin."
        : "Couldn't change that role.",
    };
  }

  // Promoting someone to agent needs an agents row, or they have no referral code.
  if (role === "agent") {
    const { data: existing } = await supabase
      .from("agents")
      .select("id")
      .eq("id", profileId)
      .maybeSingle();

    if (!existing) {
      await supabase.from("agents").insert({
        id: profileId,
        referral_code: crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase(),
        status: "approved",
      });
    }
  }

  await captureServer(admin.id, EVENTS.admin_role_changed, { target_role: role });
  revalidatePath("/admin/users");
  return { ok: true, notice: `Role updated to ${role}.` };
}

/* ---------------------------------------------------------------- partners */

const reviewSchema = z.object({
  agentId: uuid,
  status: z.enum(["approved", "rejected", "suspended", "pending"]),
  note: z.string().trim().max(500).optional(),
  commissionRate: z.coerce.number().min(0).max(1).optional(),
});

export async function reviewPartner(input: z.input<typeof reviewSchema>): Promise<AdminResult> {
  const admin = await assertAdmin();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check that request." };
  const { agentId, status, note, commissionRate } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("agents")
    .update({
      status: status as AgentStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
      review_note: note ?? null,
      ...(commissionRate !== undefined ? { commission_rate: commissionRate } : {}),
    })
    .eq("id", agentId);

  if (error) {
    log.error("partner review failed", { agent_id: agentId, status, reason: error.message });
    return { ok: false, error: "Couldn't update that application." };
  }

  await captureServer(admin.id, EVENTS.admin_partner_reviewed, { status });
  revalidatePath("/admin/partners");
  return { ok: true, notice: `Partner ${status}.` };
}

/* ------------------------------------------------------------ invitations */

export async function setInvitationStatus(
  eventId: string,
  status: EventStatus
): Promise<AdminResult> {
  const admin = await assertAdmin();
  if (!uuid.safeParse(eventId).success) return { ok: false, error: "Unknown invitation." };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("events")
    .select("slug, published_at")
    .eq("id", eventId)
    .maybeSingle();

  if (!current) return { ok: false, error: "Unknown invitation." };

  const { error } = await supabase
    .from("events")
    .update({
      status,
      published_at:
        status === "published" ? (current.published_at ?? new Date().toISOString()) : current.published_at,
    })
    .eq("id", eventId);

  if (error) return { ok: false, error: "Couldn't change that invitation." };

  await captureServer(admin.id, EVENTS.admin_invitation_moderated, { status });
  revalidatePath("/admin/invitations");
  revalidatePath(`/invite/${current.slug}`);
  return { ok: true, notice: `Invitation set to ${status}.` };
}

/* --------------------------------------------------------------- showcase */

/**
 * Curating publishes a *sanitised clone*, never the host's live invitation.
 * `generate_showcase_clone` re-checks consent itself and refuses without it, so
 * a mis-click here cannot expose a family who never agreed.
 */
export async function curateShowcase(eventId: string, tags: string[] = []): Promise<AdminResult> {
  const admin = await assertAdmin();
  if (!uuid.safeParse(eventId).success) return { ok: false, error: "Unknown invitation." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("generate_showcase_clone", {
    p_source_id: eventId,
    p_tags: tags,
  });

  if (error) {
    log.warn("showcase curation failed", { event_id: eventId, reason: error.message });
    return {
      ok: false,
      error: error.message.includes("has not consented")
        ? "That host hasn't consented to being showcased."
        : "Couldn't add that to the showcase.",
    };
  }

  await captureServer(admin.id, EVENTS.admin_showcase_curated, { tag_count: tags.length });
  revalidatePath("/admin/showcase");
  revalidatePath("/showcase");
  return { ok: true, notice: "Added to the showcase." };
}

export async function removeFromShowcase(eventId: string): Promise<AdminResult> {
  const admin = await assertAdmin();
  if (!uuid.safeParse(eventId).success) return { ok: false, error: "Unknown invitation." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_showcase", { p_source_id: eventId });

  if (error) return { ok: false, error: "Couldn't remove that from the showcase." };

  await captureServer(admin.id, EVENTS.admin_showcase_curated, { removed: true });
  revalidatePath("/admin/showcase");
  revalidatePath("/showcase");
  return { ok: true, notice: "Removed from the showcase." };
}

/* ------------------------------------------------------------------ plans */

const planSchema = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(80),
  priceInr: z.coerce.number().int().min(0).max(1_000_000),
  description: z.string().trim().max(300).optional(),
  isActive: z.boolean().default(true),
});

/** Light CMS over the pricing table — the one piece of marketing copy that lives in Postgres. */
export async function upsertPlan(input: z.input<typeof planSchema>): Promise<AdminResult> {
  const admin = await assertAdmin();
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the plan details." };
  }
  const p = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("plans").upsert(
    {
      code: p.code,
      name: p.name,
      price_inr: p.priceInr,
      description: p.description ?? null,
      is_active: p.isActive,
    },
    { onConflict: "code" }
  );

  if (error) return { ok: false, error: "Couldn't save that plan." };

  await captureServer(admin.id, EVENTS.admin_plan_updated, { plan: p.code });
  revalidatePath("/admin/plans");
  revalidatePath("/");
  return { ok: true, notice: "Plan saved." };
}
