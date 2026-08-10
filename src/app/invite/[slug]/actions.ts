"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { inviteTag } from "@/lib/cache";
import { createClient } from "@/lib/supabase/server";
import { authProviderName } from "@/lib/auth/provider";
import { entitlementsFor } from "@/lib/invites/entitlements";
import { captureAnonymousServer } from "@/lib/posthog/server";
import { log } from "@/lib/posthog/logger";
import { EVENTS } from "@/lib/posthog/events";

export interface SubmitResult {
  ok: boolean;
  error?: string;
  /** Shown on success — e.g. when a blessing is held for the couple to approve. */
  notice?: string;
}

const rsvpSchema = z.object({
  slug: z.string().min(1),
  guestName: z.string().trim().min(1, "Please tell us your name.").max(120),
  attending: z.enum(["yes", "no", "maybe"]),
  headcount: z.coerce.number().int().min(0).max(50),
  subEventKeys: z.array(z.string().max(60)).max(30),
  meal: z.string().trim().max(60).optional(),
  message: z.string().trim().max(1000).optional(),
  guestToken: z.string().trim().max(64).optional(),
});

export type RsvpInput = z.input<typeof rsvpSchema>;

/**
 * Guests are anonymous, so this runs under the anon role and relies on the
 * "guests submit rsvps" policy: inserts are only accepted for published events.
 */
export async function submitRsvp(input: RsvpInput): Promise<SubmitResult> {
  const parsed = rsvpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const data = parsed.data;

  if (authProviderName() === "cognito") {
    const { getPublishedInviteBySlug } = await import("@aws/repo/invites");
    const found = await getPublishedInviteBySlug(data.slug);
    // Silent success for an unknown or unpublished slug — the same shape the
    // Supabase branch uses. A guest who mistypes should not be told which
    // invitations exist.
    if (!found) return { ok: true };

    const { submitRsvp: write } = await import("@aws/repo/guest");
    const result = await write({
      eventId: found.invite.id,
      guestName: data.guestName,
      attending: data.attending,
      headcount: data.headcount,
      message: data.message,
      meal: data.meal,
      subEventKeys: data.subEventKeys,
    });
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  }

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, plan_code")
    .eq("slug", data.slug)
    .eq("status", "published")
    .maybeSingle();

  // Demo invites have no row to attach to; accept silently so the UI still works.
  if (!event) return { ok: true };

  // The paywall, not the hint. A free invitation renders no RSVP section, but a
  // Server Action is a public HTTP endpoint — anyone can post to it whether or
  // not a form was drawn. Checked here against the row, because the browser's
  // idea of the plan is not evidence.
  if (!entitlementsFor(event.plan_code).rsvp) {
    return { ok: false, error: "This invitation is not collecting replies." };
  }

  let guestId: string | null = null;
  if (data.guestToken) {
    const { data: guest } = await supabase
      .from("guests")
      .select("id")
      .eq("event_id", event.id)
      .eq("invite_token", data.guestToken)
      .maybeSingle();
    guestId = guest?.id ?? null;
  }

  const { error } = await supabase.from("rsvps").insert({
    event_id: event.id,
    guest_id: guestId,
    guest_name: data.guestName,
    attending: data.attending,
    headcount: data.attending === "no" ? 0 : data.headcount,
    sub_event_keys: data.subEventKeys,
    meal: data.meal ?? null,
    message: data.message ?? null,
  });

  if (error) {
    log.error("rsvp insert failed", { event_id: event.id, reason: error.message });
    return { ok: false, error: "We couldn't record your response. Please try again." };
  }

  // Anonymous: guests have no account, and we deliberately don't create a
  // person profile for each one. No name, meal preference or message is sent.
  await captureAnonymousServer(event.id, EVENTS.rsvp_submitted, {
    event_id: event.id,
    attending: data.attending,
    headcount: data.headcount,
    sub_event_count: data.subEventKeys.length,
    was_invited_personally: Boolean(guestId),
    left_message: Boolean(data.message),
  });

  revalidatePath(`/invite/${data.slug}`);

  revalidateTag(inviteTag(data.slug));
  return { ok: true };
}

const blessingSchema = z.object({
  slug: z.string().min(1),
  name: z.string().trim().max(120).optional(),
  message: z.string().trim().min(1, "Write a few words first.").max(1000),
});

export type BlessingInput = z.input<typeof blessingSchema>;

export async function submitBlessing(input: BlessingInput): Promise<SubmitResult> {
  const parsed = blessingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const { slug, name, message } = parsed.data;

  if (authProviderName() === "cognito") {
    const { getPublishedInviteBySlug } = await import("@aws/repo/invites");
    const found = await getPublishedInviteBySlug(slug);
    if (!found) return { ok: true };

    const { submitWish } = await import("@aws/repo/guest");
    const result = await submitWish({ eventId: found.invite.id, name: name ?? "", message });
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  }

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, settings, plan_code")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!event) return { ok: true };

  // `blessingWall` has been declared in the entitlements table since it was
  // written and enforced nowhere, so every free invitation had a guestbook it
  // was not entitled to. Same reasoning as the RSVP guard above.
  if (!entitlementsFor(event.plan_code).blessingWall) {
    return { ok: false, error: "This invitation is not collecting messages." };
  }

  const moderate = Boolean((event.settings as { moderateBlessings?: boolean })?.moderateBlessings);

  const { error } = await supabase.from("blessings").insert({
    event_id: event.id,
    name: name || "A well-wisher",
    message,
    is_approved: !moderate,
  });

  if (error) {
    log.error("blessing insert failed", { event_id: event.id, reason: error.message });
    return { ok: false, error: "We couldn't post your blessing. Please try again." };
  }

  // Length only — the blessing itself is private to the family.
  await captureAnonymousServer(event.id, EVENTS.blessing_submitted, {
    event_id: event.id,
    held_for_moderation: moderate,
    message_length: message.length,
    named: Boolean(name),
  });

  revalidatePath(`/invite/${slug}`);

  revalidateTag(inviteTag(slug));
  return {
    ok: true,
    notice: moderate ? "Thank you — your blessing will appear once the hosts approve it." : undefined,
  };
}
