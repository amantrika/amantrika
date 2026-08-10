import { NextResponse } from "next/server";
import { getCachedInvite } from "@/lib/cache";

/**
 * Add-to-calendar for guests: `/invite/<slug>/calendar.ics`.
 *
 * An .ics file is the only "add to calendar" that works everywhere — Google,
 * Apple, Outlook and every Indian Android default all understand it, with no
 * account, no permission prompt and no JavaScript. The alternative, per-vendor
 * deep links, means four buttons and four ways to be wrong.
 *
 * One VEVENT per ceremony, so a guest attending only the reception gets only
 * that in their calendar.
 */
export const dynamic = "force-dynamic";

/** RFC 5545: escape commas, semicolons, backslashes and newlines in text. */
function esc(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** UTC basic format: 20260815T063000Z. */
function stamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Lines longer than 75 octets must be folded, or strict parsers (Outlook is
 * the strict one) reject the whole file. A folded line continues with a single
 * leading space.
 */
function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 72) {
    parts.push(" " + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  if (rest) parts.push(" " + rest);
  return parts.join("\r\n");
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const invite = await getCachedInvite(slug);
  if (!invite) return new NextResponse("Not found", { status: 404 });

  const now = stamp(new Date().toISOString());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Amantrika//Invitation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  // Ceremonies if there are any; otherwise the celebration itself, so an
  // invitation without a broken-out schedule still produces a usable file.
  const entries = invite.events.length
    ? invite.events.map((e) => ({
        uid: `${slug}-${e.id}@amantrika`,
        title: `${e.name} — ${invite.title}`,
        date: e.date || invite.mainDate.slice(0, 10),
        location: [e.venue, e.address].filter(Boolean).join(", "),
        note: e.dressCode ? `Dress code: ${e.dressCode}` : "",
      }))
    : [
        {
          uid: `${slug}@amantrika`,
          title: invite.title,
          date: invite.mainDate.slice(0, 10),
          location: invite.city,
          note: "",
        },
      ];

  for (const e of entries) {
    // All-day entries: DTSTART;VALUE=DATE with DTEND the following day, which
    // is what the spec means by an exclusive end. Times are deliberately not
    // used — hosts type them as free text ("7:30 PM", "after sunset"), and
    // guessing a timezone from that would put ceremonies on the wrong day.
    const start = e.date.replace(/-/g, "");
    const end = new Date(`${e.date}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    const endStr = end.toISOString().slice(0, 10).replace(/-/g, "");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${endStr}`,
      fold(`SUMMARY:${esc(e.title)}`),
      ...(e.location ? [fold(`LOCATION:${esc(e.location)}`)] : []),
      ...(e.note ? [fold(`DESCRIPTION:${esc(e.note)}`)] : []),
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${slug}.ics"`,
      "cache-control": "public, max-age=3600",
    },
  });
}
