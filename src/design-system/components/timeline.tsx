"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { icons, type IconName } from "../icons";
import { fadeUpStagger, staggerContainer } from "../motion/presets";
import { Card } from "./Card";
import { Badge } from "./bits";

/**
 * Timeline family — vertical connected timeline with custom icons, a
 * horizontal day itinerary, and a day schedule card.
 */

export interface TimelineEntry {
  icon: IconName;
  title: string;
  meta?: string;
  description?: string;
  badge?: string;
}

/* ---------- ConnectedTimeline — icons joined by a drawn gold thread ---------- */
export function ConnectedTimeline({ entries, className = "" }: { entries: TimelineEntry[]; className?: string }) {
  return (
    <motion.ol
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      className={`relative flex flex-col gap-8 ${className}`}
    >
      {/* the connecting dhaga */}
      <span aria-hidden className="absolute bottom-6 left-7 top-6 w-px border-l-2 border-dashed border-ornate/60" />
      {entries.map((e, i) => {
        const Icon = icons[e.icon];
        return (
          <motion.li key={e.title + i} variants={fadeUpStagger} custom={i} className="relative flex gap-5">
            <span className="relative z-10 flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-ornate bg-surface shadow-resting">
              <Icon className="size-8 text-primary" />
              <span aria-hidden className="absolute -bottom-1 -right-1 size-3 rounded-full border border-ornate bg-accent" />
            </span>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="type-h3 text-primary">{e.title}</h3>
                {e.badge && <Badge tone="accent">{e.badge}</Badge>}
              </div>
              {e.meta && <p className="type-overline mt-0.5">{e.meta}</p>}
              {e.description && <p className="mt-1 type-body text-muted">{e.description}</p>}
            </div>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}

/* ---------- HorizontalItinerary — left-to-right day flow ---------- */
export function HorizontalItinerary({ entries, className = "" }: { entries: TimelineEntry[]; className?: string }) {
  return (
    <div className={`overflow-x-auto pb-2 ${className}`}>
      <ol className="relative flex min-w-max items-start gap-2 px-2">
        <span aria-hidden className="absolute left-8 right-8 top-7 border-t-2 border-dashed border-ornate/60" />
        {entries.map((e, i) => {
          const Icon = icons[e.icon];
          return (
            <li key={e.title + i} className="relative z-10 flex w-32 flex-col items-center text-center">
              <span className="flex size-14 items-center justify-center rounded-full border-2 border-ornate bg-surface shadow-resting">
                <Icon className="size-8 text-primary" />
              </span>
              <p className="mt-2 text-sm font-bold text-primary">{e.title}</p>
              {e.meta && <p className="type-caption">{e.meta}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- DayScheduleCard — one day's run-sheet ---------- */
export function DayScheduleCard({
  day,
  date,
  items,
  className = "",
}: {
  day: string;
  date: string;
  items: { time: string; label: string; icon?: IconName }[];
  className?: string;
}) {
  return (
    <Card variant="ornate" className={`p-6 ${className}`}>
      <div className="mb-4 flex items-baseline justify-between border-b border-ornate/40 pb-3">
        <h3 className="type-h2 text-primary">{day}</h3>
        <span className="type-overline">{date}</span>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((it) => {
          const Icon = it.icon ? icons[it.icon] : null;
          return (
            <li key={it.time + it.label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-right font-display text-lg font-semibold text-accent tabular-nums">{it.time}</span>
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-ornate" />
              {Icon && <Icon className="size-5 shrink-0 text-primary" />}
              <span className="type-body">{it.label}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ---------- MilestoneRibbon — "10 days to go" banner ---------- */
export function MilestoneRibbon({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative inline-block ${className}`}>
      <span aria-hidden className="absolute -left-3 top-1.5 size-0 border-y-[14px] border-r-[12px] border-y-transparent border-r-primary brightness-75" />
      <span aria-hidden className="absolute -right-3 top-1.5 size-0 border-y-[14px] border-l-[12px] border-y-transparent border-l-primary brightness-75" />
      <span className="relative inline-block bg-primary px-6 py-1.5 font-display text-lg font-semibold tracking-wide text-bg shadow-resting">
        {children}
      </span>
    </div>
  );
}
