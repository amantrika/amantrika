"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
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

/** Dates arrive as YYYY-MM-DD from the picker; store them as a timestamp. */
function toTimestamp(value?: string | null): string | null {
  if (!value) return null;
  const iso = value.length === 10 ? `${value}T12:00:00+05:30` : value;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const publishSchema = z.object({
  eventId: z.string().uuid(),
  planCode: z.string().min(1).max(40),
});

/**
 * Records a dummy order, marks it paid (which accrues the agent commission via
 * trigger) and publishes the invite. Every plan is enabled while payments are
 * stubbed — swapping `provider` to a real gateway is the only change needed.
 */
export async function publishEvent(input: {
  eventId: string;
  planCode: string;
}): Promise<ActionResult<{ slug: string }>> {
  const parsed = publishSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Something's off with that request." };

  const profile = await requireProfile("/onboarding");
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, slug, agent_id, owner_id")
    .eq("id", parsed.data.eventId)
    .maybeSingle();

  if (!event) return { ok: false, error: "We couldn't find that invitation." };

  const { data: plan } = await supabase
    .from("plans")
    .select("code, price_inr")
    .eq("code", parsed.data.planCode)
    .maybeSingle();

  if (!plan) return { ok: false, error: "That plan isn't available." };

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      event_id: event.id,
      buyer_id: profile.id,
      agent_id: event.agent_id,
      plan_code: plan.code,
      amount_inr: plan.price_inr,
      status: "pending",
      provider: "dummy",
    })
    .select("id")
    .single();

  if (orderError || !order) return { ok: false, error: "Couldn't start checkout." };

  // The dummy gateway always succeeds.
  const { error: payError } = await supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      provider_ref: `dummy_${order.id.slice(0, 8)}`,
    })
    .eq("id", order.id);

  if (payError) return { ok: false, error: "Payment couldn't be confirmed." };

  const { error: publishError } = await supabase
    .from("events")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", event.id);

  if (publishError) return { ok: false, error: "Couldn't publish your invitation." };

  revalidatePath("/dashboard");
  revalidatePath(`/invite/${event.slug}`);
  return { ok: true, data: { slug: event.slug } };
}
