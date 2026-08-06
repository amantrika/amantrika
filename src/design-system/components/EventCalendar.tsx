"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WeddingEvent } from "@/data/couples";
import { icons, type IconName } from "../icons";
import { Card } from "./Card";
import { Badge } from "./bits";

const eventIcon: Record<string, IconName> = {
  haldi: "garland", mehndi: "henna-cone", sangeet: "dhol", garba: "dhol",
  dholki: "dhol", pheras: "mandap", muhurtham: "mandap", "hasta melap": "varmala",
  baraat: "baraat-horse", nikah: "mosque-dome", valima: "mithai",
  kirtan: "gurudwara", "anand karaj": "gurudwara", langar: "mithai",
  ceremony: "church-bell", "cocktail hour": "chai-kulhad", reception: "fireworks",
  wedding: "mandap", nichayathartham: "coconut",
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * EventCalendar — a month grid marking every wedding event, with the theme's
 * icons on the marked days. Click a day to see what's happening.
 *
 * @example <EventCalendar events={couple.events} />
 */
export function EventCalendar({
  events,
  className = "",
}: {
  events: WeddingEvent[];
  className?: string;
}) {
  const firstEventDate = events[0]?.date ?? "2026-11-24";
  const [cursor, setCursor] = useState(() => {
    const d = new Date(`${firstEventDate}T00:00:00`);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState<string | null>(firstEventDate);

  const byDate = useMemo(() => {
    const map = new Map<string, WeddingEvent[]>();
    for (const ev of events) map.set(ev.date, [...(map.get(ev.date) ?? []), ev]);
    return map;
  }, [events]);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  const shift = (delta: number) =>
    setCursor(({ year, month }) => {
      const m = month + delta;
      if (m < 0) return { year: year - 1, month: 11 };
      if (m > 11) return { year: year + 1, month: 0 };
      return { year, month: m };
    });

  const iso = (day: number) =>
    `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const selectedEvents = selected ? byDate.get(selected) ?? [] : [];

  return (
    <Card variant="ornate" className={`p-6 ${className}`}>
      {/* month header */}
      <div className="mb-5 flex items-center justify-between">
        <button onClick={() => shift(-1)} aria-label="Previous month" className="rounded-full p-2 text-primary hover:bg-accent/12 cursor-pointer">
          <ChevronLeft className="size-5" />
        </button>
        <h3 className="type-h2 text-primary">{monthLabel}</h3>
        <button onClick={() => shift(1)} aria-label="Next month" className="rounded-full p-2 text-primary hover:bg-accent/12 cursor-pointer">
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* weekday row */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="type-overline text-center">{w}</span>
        ))}
      </div>

      {/* day grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstWeekday }).map((_, i) => <span key={`pad${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = iso(day);
          const dayEvents = byDate.get(date) ?? [];
          const marked = dayEvents.length > 0;
          const isSelected = selected === date;
          const Icon = marked ? icons[eventIcon[dayEvents[0].name.toLowerCase()] ?? "shaadi-card"] : null;
          return (
            <button
              key={day}
              onClick={() => setSelected(date)}
              aria-label={marked ? `${day}: ${dayEvents.map((e) => e.name).join(", ")}` : `${day}`}
              aria-pressed={isSelected}
              className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-soft border text-sm transition-colors cursor-pointer ${
                isSelected
                  ? "border-ornate bg-primary text-bg"
                  : marked
                    ? "border-ornate/60 bg-accent/12 text-foreground hover:bg-accent/20"
                    : "border-transparent text-muted hover:bg-foreground/5"
              }`}
            >
              <span className={`tabular-nums ${marked ? "font-bold" : ""}`}>{day}</span>
              {Icon && <Icon className={`size-4 ${isSelected ? "text-bg" : "text-primary"}`} />}
            </button>
          );
        })}
      </div>

      {/* selected day detail */}
      <div className="mt-5 border-t border-ornate/40 pt-4">
        {selectedEvents.length ? (
          <ul className="flex flex-col gap-3">
            {selectedEvents.map((ev) => {
              const Icon = icons[eventIcon[ev.name.toLowerCase()] ?? "shaadi-card"];
              return (
                <li key={ev.id} className="flex items-start gap-3">
                  <Icon className="mt-0.5 size-6 shrink-0 text-accent" />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold text-primary">
                      {ev.name}
                      {ev.dressCode && <Badge tone="accent">{ev.dressCode}</Badge>}
                    </p>
                    <p className="type-caption">{ev.time} · {ev.venue}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="type-caption italic">Nothing planned on this day — rest up, there&apos;s dancing ahead.</p>
        )}
      </div>
    </Card>
  );
}
