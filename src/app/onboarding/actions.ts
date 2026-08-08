"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payments";
import { computePrice } from "@/lib/pricing";
import { siteUrl } from "@/lib/env";
import { captureServer } from "@/lib/posthog/server";
import { log } from "@/lib/posthog/logger";
import { EVENTS } from "@/lib/posthog/events";
import { SHOWCASE_CONSENT_TEXT } from "@/lib/consent";
import type { EventType } from "@/lib/supabase/types";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use at least 3 characters.")
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens.");

const RESERVED = new Set([
  "admin", "agent", "api", "auth", "dashboard", "design-system", "invite",
  "login", "signup", "onboarding", "pricing", "about", "help", "support",
]);

/** True when the slug is free. Checked against every event, not just published ones. */
export async function checkSlug(
  slug: string,
  excludeEventId?: string
): Promise<ActionResult<{ available: boolean }>> {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (RESERVED.has(parsed.data)) return { ok: true, data: { available: false } };

  const supabase = await createClient();
  let query = supabase.from("events").select("id").eq("slug", parsed.data).limit(1);
  if (excludeEventId) query = query.neq("id", excludeEventId);

  const { data, error } = await query;
  if (error) return { ok: false, error: "Couldn't check that link. Try again." };

  return { ok: true, data: { available: (data ?? []).length === 0 } };
}

const hostSchema = z.object({
  name: z.string().trim().min(1).max(120),
  family: z.string().trim().max(160).optional(),
  role: z.string().trim().max(40).optional(),
});

const subEventSchema = z.object({
  key: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(120),
  date: z.string().trim().max(20).optional(),
  time: z.string().trim().max(40).optional(),
  venue: z.string().trim().max(200).optional(),
  address: z.string().trim().max(400).optional(),
  dressCode: z.string().trim().max(120).optional(),
});

const draftSchema = z.object({
  eventId: z.string().uuid().optional(),
  slug: slugSchema,
  eventType: z.string().max(40),
  themeId: z.string().trim().max(60),
  title: z.string().trim().max(200).optional(),
  hosts: z.array(hostSchema).max(8),
  hashtag: z.string().trim().max(80).optional(),
  mainDate: z.string().trim().max(30).optional(),
  city: z.string().trim().max(120).optional(),
  story: z.string().trim().max(5000).optional(),
  subEvents: z.array(subEventSchema).max(30),
  /** Set by an agent creating this on a client's behalf. */
  clientEmail: z.string().email().optional(),
  // Consent, default off. Only ever set from an explicit tick by the host.
  showcaseConsent: z.boolean().default(false),
  showcaseAnonymise: z.boolean().default(true),
});



export type DraftInput = z.input<typeof draftSchema>;

/**
 * Creates the draft event on first save and updates it thereafter, so photo
 * uploads have an event id to attach to before the invite is published.
 */
export async function saveDraft(input: DraftInput): Promise<ActionResult<{ eventId: string }>> {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const d = parsed.data;

  const profile = await requireProfile("/onboarding");
  const supabase = await createClient();

  const available = await checkSlug(d.slug, d.eventId);
  if (!available.ok) return { ok: false, error: available.error };
  if (!available.data?.available) return { ok: false, error: "That link is already taken." };

  const title = d.title || d.hosts.map((h) => h.name).filter(Boolean).join(" & ") || "Our celebration";

  const row = {
    slug: d.slug,
    event_type: d.eventType as EventType,
    theme_id: d.themeId,
    title,
    hosts: d.hosts,
    hashtag: d.hashtag || null,
    main_datetime: toTimestamp(d.mainDate),
    city: d.city || null,
    story: d.story || null,
    permissions: {
      showcase_consent: d.showcaseConsent,
      showcase_anonymise: d.showcaseAnonymise,
    },
  };

  let eventId = d.eventId;

  if (eventId) {
    const { error } = await supabase.from("events").update(row).eq("id", eventId);
    if (error) return { ok: false, error: "Couldn't save your changes." };
  } else {
    // An agent owns nothing: the event is theirs to manage, the host owns it.
    const isAgent = profile.role === "agent";
    const { data, error } = await supabase
      .from("events")
      .insert({
        ...row,
        owner_id: profile.id,
        agent_id: isAgent ? profile.id : null,
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !data) return { ok: false, error: "Couldn't create your invitation." };
    eventId = data.id;
  }

  await replaceSubEvents(eventId, d.subEvents);
  await recordConsentIfChanged(eventId, profile.id, d.showcaseConsent, d.showcaseAnonymise);

  await captureServer(profile.id, EVENTS.invite_draft_saved, {
    event_id: eventId,
    event_type: d.eventType,
    theme_id: d.themeId,
    host_count: d.hosts.length,
    sub_event_count: d.subEvents.length,
    has_story: Boolean(d.story),
    is_first_save: !d.eventId,
    created_by_agent: profile.role === "agent",
  });

  revalidatePath("/dashboard");
  return { ok: true, data: { eventId } };
}

async function replaceSubEvents(eventId: string, subEvents: z.infer<typeof subEventSchema>[]) {
  const supabase = await createClient();
  // Simplest correct sync for a list this small: clear and reinsert.
  await supabase.from("sub_events").delete().eq("event_id", eventId);
  if (subEvents.length === 0) return;

  await supabase.from("sub_events").insert(
    subEvents.map((s, i) => ({
      event_id: eventId,
      key: s.key,
      name: s.name,
      starts_at: toTimestamp(s.date),
      time_label: s.time || null,
      venue: s.venue || null,
      address: s.address || null,
      dress_code: s.dressCode || null,
      sort_order: i,
    }))
  );
}

/**
 * Appends to the consent audit trail, but only when the answer actually changed
 * — otherwise every autosave would write a row and the history would be noise.
 *
 * `showcase_consents` is append-only by design: a withdrawal is a new row saying
 * `granted = false`, never an edit to the row that granted it.
 */
async function recordConsentIfChanged(
  eventId: string,
  profileId: string,
  granted: boolean,
  anonymise: boolean
) {
  const supabase = await createClient();

  const { data: latest } = await supabase
    .from("showcase_consents")
    .select("granted, anonymise")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest && latest.granted === granted && latest.anonymise === anonymise) return;
  // Nothing to record if they never turned it on and still haven't.
  if (!latest && !granted) return;

  const headerList = await headers();

  const { error } = await supabase.from("showcase_consents").insert({
    event_id: eventId,
    profile_id: profileId,
    granted,
    anonymise,
    consent_text: SHOWCASE_CONSENT_TEXT,
    // Deliberately recorded: consent evidence is the one place an IP is warranted.
    ip_address:
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerList.get("x-real-ip") ??
      null,
    user_agent: headerList.get("user-agent")?.slice(0, 400) ?? null,
  });

  if (error) log.warn("consent audit write failed", { event_id: eventId, reason: error.message });

  // Withdrawal must take the public clone down immediately, not on a cron.
  if (!granted) {
    const { error: withdrawError } = await supabase.rpc("withdraw_showcase", {
      p_source_id: eventId,
    });
    if (withdrawError) {
      log.error("showcase withdrawal failed", {
        event_id: eventId,
        reason: withdrawError.message,
      });
    }
  }
}

/** Dates arrive as YYYY-MM-DD from the picker; store them as a timestamp. */
function toTimestamp(value?: string | null): string | null {
  if (!value) return null;
  const iso = value.length === 10 ? `${value}T12:00:00+05:30` : value;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const checkoutSchema = z.object({
  eventId: z.string().uuid(),
  planCode: z.string().min(1).max(40),
});

/**
 * A free plan publishes here and now; a paid plan gets a checkout URL and
 * nothing else. Which one happened is the caller's only branch.
 */
export type CheckoutStart =
  | { kind: "published"; slug: string }
  | { kind: "checkout"; checkoutUrl: string };

/**
 * Opens a checkout. Deliberately does **not** publish.
 *
 * The previous version of this action inserted an order and marked it paid in
 * the same breath, which meant any signed-in browser could publish for free by
 * calling it. Now the amount comes from `computePrice()` on the server, the
 * order is written under the service role (the client has no insert grant), and
 * only a signature-verified webhook may ever set `status = 'paid'`.
 */
export async function startCheckout(input: {
  eventId: string;
  planCode: string;
}): Promise<ActionResult<CheckoutStart>> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Something's off with that request." };

  const profile = await requireProfile("/onboarding");
  const supabase = await createClient();

  // Read under the caller's own grants, so RLS proves they own this invitation
  // before anything is written under the service role.
  const { data: event } = await supabase
    .from("events")
    .select("id, slug, agent_id, owner_id, main_datetime")
    .eq("id", parsed.data.eventId)
    .maybeSingle();

  if (!event) return { ok: false, error: "We couldn't find that invitation." };

  const { data: plan } = await supabase
    .from("plans")
    .select("code, name, price_inr, dodo_product_id")
    .eq("code", parsed.data.planCode)
    .maybeSingle();

  if (!plan) return { ok: false, error: "That plan isn't available." };

  const price = computePrice({
    plan,
    eventDate: event.main_datetime ? new Date(event.main_datetime) : null,
  });

  // Free plans never reach a processor: there is nothing to collect, so the
  // invitation publishes immediately (watermarked, per the plan's own features).
  if (price.final_price_inr === 0) {
    const { error: publishError } = await supabase
      .from("events")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", event.id);

    if (publishError) {
      log.error("free invite could not be published", {
        event_id: event.id,
        reason: publishError.message,
      });
      return { ok: false, error: "Couldn't publish your invitation." };
    }

    await captureServer(profile.id, EVENTS.invite_published, {
      event_id: event.id,
      slug: event.slug,
      plan: plan.code,
      via_agent: Boolean(event.agent_id),
    });

    revalidatePath("/dashboard");
    revalidatePath(`/invite/${event.slug}`);
    return { ok: true, data: { kind: "published", slug: event.slug } };
  }

  // The processor needs somewhere to send the receipt, and so do we.
  if (!profile.email) {
    return { ok: false, error: "Add an email address to your account before paying." };
  }

  const provider = getPaymentProvider();
  const admin = createAdminClient();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      event_id: event.id,
      buyer_id: profile.id,
      agent_id: event.agent_id,
      plan_code: plan.code,
      amount_inr: price.final_price_inr,
      currency: "INR",
      status: "pending",
      provider: provider.name,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    log.error("checkout could not create order", {
      event_id: event.id,
      plan: plan.code,
      reason: orderError?.message,
    });
    return { ok: false, error: "Couldn't start checkout." };
  }

  let checkout;
  try {
    checkout = await provider.createCheckout({
      order: {
        id: order.id,
        amount_inr: price.final_price_inr,
        currency: "INR",
        plan_code: plan.code,
        plan_name: plan.name,
        provider_product_id: plan.dodo_product_id,
      },
      customer: { email: profile.email, name: profile.full_name ?? "Amantrika host" },
      successUrl: `${siteUrl}/dashboard/${event.id}?paid=1`,
      cancelUrl: `${siteUrl}/dashboard/${event.id}`,
    });
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    log.error("provider refused to open checkout", {
      order_id: order.id,
      provider: provider.name,
      reason,
    });
    await admin
      .from("orders")
      .update({ status: "failed", failure_reason: reason.slice(0, 500) })
      .eq("id", order.id);
    return { ok: false, error: "Couldn't reach the payment provider. Please try again." };
  }

  await admin
    .from("orders")
    .update({ provider_session_id: checkout.providerOrderId })
    .eq("id", order.id);

  await captureServer(profile.id, EVENTS.checkout_started, {
    event_id: event.id,
    order_id: order.id,
    plan: plan.code,
    amount_inr: price.final_price_inr,
    provider: provider.name,
  });

  return { ok: true, data: { kind: "checkout", checkoutUrl: checkout.checkoutUrl } };
}
