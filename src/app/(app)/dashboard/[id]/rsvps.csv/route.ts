import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { getManagedEvent, getRsvps } from "@/lib/invites/queries";

/**
 * RSVP export for the host: `/dashboard/<id>/rsvps.csv`.
 *
 * Hosts run weddings from a spreadsheet — caterers want a headcount, and the
 * family wants to tick names off. Without an export they retype the list, which
 * is how a guest gets missed.
 *
 * **This file contains guest PII**, including phone numbers. `CLAUDE.md` §2.12
 * allows it in exactly one place: the owner's authenticated dashboard. So this
 * route proves ownership before writing a byte, and is marked no-store so it
 * never lands in a shared cache.
 */
export const dynamic = "force-dynamic";

/**
 * Quote every field, always.
 *
 * Not defensive habit — a wedding guest list is full of commas ("Iyer, Meera"),
 * quotes and newlines in the message field, and any one of them silently shifts
 * every later column. Doubling the quote is how RFC 4180 escapes it.
 */
function cell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const profile = await getProfile();
  if (!profile) return new NextResponse("Unauthorized", { status: 401 });

  // Ownership, not merely authentication: a signed-in host must not be able to
  // export somebody else's guest list by changing the id in the URL.
  const event = await getManagedEvent(id, profile.id);
  if (!event) return new NextResponse("Not found", { status: 404 });

  const rsvps = await getRsvps(id, profile.id);

  const header = ["Name", "Attending", "Guests", "Phone", "Ceremonies", "Message", "Replied"];
  const rows = rsvps.map((r) =>
    [
      r.guest_name,
      r.attending,
      r.headcount,
      // Phone is not on the AWS row shape yet; present on Supabase.
      (r as unknown as { phone?: string }).phone ?? "",
      (r.sub_event_keys ?? []).join(" · "),
      r.message ?? "",
      new Date(r.created_at).toLocaleString("en-IN"),
    ].map(cell).join(",")
  );

  // A BOM, so Excel opens Devanagari names as UTF-8 instead of mojibake. Without
  // it "प्रिया" arrives as "à¤ªà¥à¤°à¤¿à¤¯à¤¾" and the host assumes we mangled it.
  const csv = "﻿" + [header.map(cell).join(","), ...rows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${event.slug}-rsvps.csv"`,
      "cache-control": "no-store",
    },
  });
}
