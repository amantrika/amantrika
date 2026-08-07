"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { EventSettings, EventStatus } from "@/lib/supabase/types";

export interface Result {
  ok: boolean;
  error?: string;
}

const uuid = z.string().uuid();

/** Feature switches on the live invite. */
export async function updateSettings(eventId: string, settings: EventSettings): Promise<Result> {
  if (!uuid.safeParse(eventId).success) return { ok: false, error: "Unknown invitation." };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("events")
    .select("slug, settings")
    .eq("id", eventId)
    .maybeSingle();

  if (!current) return { ok: false, error: "Unknown invitation." };

  const { error } = await supabase
    .from("events")
    .update({ settings: { ...current.settings, ...settings } })
    .eq("id", eventId);

  if (error) return { ok: false, error: "Couldn't save those settings." };

  revalidatePath(`/dashboard/${eventId}`);
  revalidatePath(`/invite/${current.slug}`);
  return { ok: true };
}

/** Publish, unpublish or archive. Unpublishing takes the invite offline immediately. */
export async function setEventStatus(eventId: string, status: EventStatus): Promise<Result> {
  if (!uuid.safeParse(eventId).success) return { ok: false, error: "Unknown invitation." };
  if (!["draft", "published", "archived"].includes(status)) {
    return { ok: false, error: "Unknown status." };
  }

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

  if (error) return { ok: false, error: "Couldn't change the status." };

  revalidatePath(`/dashboard/${eventId}`);
  revalidatePath(`/invite/${current.slug}`);
  return { ok: true };
}

const guestSchema = z.object({
  eventId: uuid,
  name: z.string().trim().min(1, "A name is required.").max(120),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().max(160).optional(),
  side: z.string().trim().max(40).optional(),
  guestGroup: z.string().trim().max(40).optional(),
  headcount: z.coerce.number().int().min(1).max(50).default(1),
  invitedKeys: z.array(z.string().max(60)).max(30).default([]),
});

export async function addGuest(input: z.input<typeof guestSchema>): Promise<Result> {
  const parsed = guestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the guest details." };
  }
  const g = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("guests").insert({
    event_id: g.eventId,
    name: g.name,
    phone: g.phone || null,
    email: g.email || null,
    side: g.side || null,
    guest_group: g.guestGroup || null,
    headcount: g.headcount,
    invited_keys: g.invitedKeys,
  });

  if (error) return { ok: false, error: "Couldn't add that guest." };

  revalidatePath(`/dashboard/${g.eventId}`);
  return { ok: true };
}

export async function removeGuest(eventId: string, guestId: string): Promise<Result> {
  if (!uuid.safeParse(guestId).success) return { ok: false, error: "Unknown guest." };

  const supabase = await createClient();
  const { error } = await supabase.from("guests").delete().eq("id", guestId);
  if (error) return { ok: false, error: "Couldn't remove that guest." };

  revalidatePath(`/dashboard/${eventId}`);
  return { ok: true };
}

/** Bulk import from a pasted list — one guest per line, "Name, headcount". */
export async function importGuests(eventId: string, raw: string): Promise<Result & { added?: number }> {
  if (!uuid.safeParse(eventId).success) return { ok: false, error: "Unknown invitation." };

  const rows = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 500)
    .map((line) => {
      const [name, count] = line.split(",").map((p) => p.trim());
      const headcount = Number.parseInt(count ?? "1", 10);
      return {
        event_id: eventId,
        name: name.slice(0, 120),
        headcount: Number.isFinite(headcount) && headcount > 0 ? Math.min(headcount, 50) : 1,
      };
    })
    .filter((r) => r.name);

  if (rows.length === 0) return { ok: false, error: "Nothing to import." };

  const supabase = await createClient();
  const { error } = await supabase.from("guests").insert(rows);
  if (error) return { ok: false, error: "Couldn't import that list." };

  revalidatePath(`/dashboard/${eventId}`);
  return { ok: true, added: rows.length };
}

export async function setBlessingApproval(
  eventId: string,
  blessingId: string,
  approved: boolean
): Promise<Result> {
  if (!uuid.safeParse(blessingId).success) return { ok: false, error: "Unknown blessing." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("blessings")
    .update({ is_approved: approved })
    .eq("id", blessingId);

  if (error) return { ok: false, error: "Couldn't update that blessing." };

  revalidatePath(`/dashboard/${eventId}`);
  return { ok: true };
}
