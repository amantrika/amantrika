"use client";

import { CalendarPlus, MapPin } from "lucide-react";
import { motifs, type MotifName } from "../motifs";
import type { WeddingEvent } from "@/data/couples";
import { Card } from "./Card";
import { Badge } from "./bits";

const eventMotif: Record<string, MotifName> = {
  haldi: "marigold",
  mehndi: "mehndi-corner",
  sangeet: "diya",
  garba: "diya",
  pheras: "kalash",
  muhurtham: "kalash",
  "hasta melap": "kalash",
  dholki: "diya",
  baraat: "paisley",
  nikah: "crescent-star",
  valima: "crescent-star",
  kirtan: "paisley",
  "anand karaj": "kalash",
  langar: "marigold",
  ceremony: "church-arch",
  "cocktail hour": "olive-branch",
  mass: "floral-cross",
  reception: "diya",
};

function makeIcs(ev: WeddingEvent): string {
  const dt = ev.date.replace(/-/g, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Amantrika//Invite//EN",
    "BEGIN:VEVENT",
    `SUMMARY:${ev.name}`,
    `DTSTART;VALUE=DATE:${dt}`,
    `LOCATION:${ev.venue}, ${ev.address}`,
    `DESCRIPTION:${ev.name} at ${ev.time}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * One event on the invite timeline: themed motif icon, details,
 * client-side .ics download and a directions link.
 */
export function EventTimelineItem({ event, className = "" }: { event: WeddingEvent; className?: string }) {
  const Motif = motifs[eventMotif[event.name.toLowerCase()] ?? "diya"];

  const addToCalendar = () => {
    const blob = new Blob([makeIcs(event)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.name.toLowerCase().replace(/\s+/g, "-")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const dateLabel = new Date(`${event.date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Card variant="ornate" className={`p-6 sm:p-7 ${className}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-ornate/60 bg-accent/10">
          <Motif aria-hidden className="diya-flicker size-8 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="type-h2 text-primary">{event.name}</h3>
            {event.dressCode && <Badge tone="accent">{event.dressCode}</Badge>}
          </div>
          <p className="mt-1 type-body-lg">
            {dateLabel} · {event.time}
          </p>
          <p className="type-body text-muted">
            {event.venue} — {event.address}
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            <button onClick={addToCalendar} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-accent cursor-pointer">
              <CalendarPlus className="size-4" /> Add to calendar
            </button>
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(`${event.venue} ${event.address}`)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-accent"
            >
              <MapPin className="size-4" /> Get directions
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}
