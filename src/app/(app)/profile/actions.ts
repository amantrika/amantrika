"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { captureServer } from "@/lib/posthog/server";
import { log } from "@/lib/posthog/logger";
import { EVENTS } from "@/lib/posthog/events";

export interface ProfileResult {
  ok: boolean;
  error?: string;
  notice?: string;
}

/**
 * Accepts what people actually paste — "@name", a full profile URL, or the bare
 * handle — and stores the handle alone. Asking someone to strip the @ themselves
 * is a small rudeness that produces bad data.
 */
const instagramSchema = z
  .string()
  .trim()
  .transform((v) =>
    v
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/^@/, "")
      .replace(/\/+$/, "")
      .trim()
  )
  .refine((v) => v === "" || /^[A-Za-z0-9._]{1,30}$/.test(v), {
    message: "That doesn't look like an Instagram handle.",
  });

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Tell us your name.").max(120),
  phone: z.string().trim().max(30).optional(),
  city: z.string().trim().max(80).optional(),
  instagram: instagramSchema.optional(),
  occasionNote: z.string().trim().max(200).optional(),
  bio: z.string().trim().max(400).optional(),
});

export type ProfileInput = z.input<typeof profileSchema>;

export async function updateProfile(input: ProfileInput): Promise<ProfileResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const d = parsed.data;

  const profile = await requireProfile("/profile");
  const supabase = await createClient();

  // RLS restricts this to the caller's own row, so the id is not a trust boundary.
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: d.fullName,
      phone: d.phone || null,
      city: d.city || null,
      instagram: d.instagram || null,
      occasion_note: d.occasionNote || null,
      bio: d.bio || null,
    })
    .eq("id", profile.id);

  if (error) {
    log.warn("profile update failed", { reason: error.message });
    return { ok: false, error: "Couldn't save those changes." };
  }

  // Which fields are filled, never their contents.
  await captureServer(profile.id, EVENTS.profile_updated, {
    has_instagram: Boolean(d.instagram),
    has_city: Boolean(d.city),
    has_bio: Boolean(d.bio),
    has_occasion: Boolean(d.occasionNote),
  });

  revalidatePath("/profile");
  return { ok: true, notice: "Saved." };
}

const applySchema = z.object({
  agencyName: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});

/**
 * Applies to the partner programme.
 *
 * Deliberately does not change the caller's role — `apply_to_be_partner` only
 * creates the `agents` row as `pending`. Becoming a partner requires an admin to
 * approve, which is what stops this being a self-service promotion.
 */
export async function applyToBePartner(input: z.input<typeof applySchema>): Promise<ProfileResult> {
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the form." };

  const profile = await requireProfile("/profile");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("apply_to_be_partner", {
    p_agency_name: parsed.data.agencyName || undefined,
    p_note: parsed.data.note || undefined,
  });

  if (error) {
    log.error("partner application failed", { reason: error.message });
    return { ok: false, error: "Couldn't send that application." };
  }

  await captureServer(profile.id, EVENTS.partner_applied, { outcome: String(data) });

  revalidatePath("/profile");

  if (data === "pending") {
    return { ok: true, notice: "Application sent. We review these by hand — expect a reply soon." };
  }
  return { ok: true, notice: `You're already ${data}.` };
}
