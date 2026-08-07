"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import type { WeddingEvent } from "@/data/couples";
import { store } from "@/lib/store";
import { Button } from "./Button";
import { Card } from "./Card";
import { Input, Textarea } from "./fields";
import { Marigold } from "../motifs";

const attendOptions = [
  { value: "yes", label: "Joyfully accept", sub: "We'll be there!" },
  { value: "no", label: "Regretfully decline", sub: "Sending love from afar" },
  { value: "maybe", label: "Still deciding", sub: "We'll confirm soon" },
] as const;

/**
 * RSVP form: ornate radio cards, guest-count stepper, per-event checkboxes,
 * theme-driven meal options. Persists to localStorage (amantrika:rsvps).
 */
export interface RsvpSubmission {
  guestName: string;
  attending: "yes" | "no" | "maybe";
  headcount: number;
  events: string[];
  meal: string;
  message: string;
}

export function RSVPForm({
  events,
  mealOptions,
  guestName = "",
  onSubmit,
  className = "",
}: {
  events: WeddingEvent[];
  mealOptions: string[];
  guestName?: string;
  /** Persist the response. Omit to fall back to the localStorage demo store. */
  onSubmit?: (submission: RsvpSubmission) => Promise<{ ok: boolean; error?: string }>;
  className?: string;
}) {
  const [name, setName] = useState(guestName);
  const [attending, setAttending] = useState<"yes" | "no" | "maybe">("yes");
  const [headcount, setHeadcount] = useState(2);
  const [selEvents, setSelEvents] = useState<string[]>(events.map((e) => e.id));
  const [meal, setMeal] = useState(mealOptions[0] ?? "Veg");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const submission: RsvpSubmission = {
      guestName: name || "A well-wisher",
      attending,
      headcount,
      events: selEvents,
      meal,
      message,
    };

    if (!onSubmit) {
      store.addRsvp({ id: `r${Date.now()}`, ...submission, at: new Date().toISOString() });
      setDone(true);
      return;
    }

    setBusy(true);
    setError(null);
    const result = await onSubmit(submission);
    setBusy(false);
    if (result.ok) setDone(true);
    else setError(result.error ?? "Something went wrong. Please try again.");
  };

  if (done) {
    return (
      <Card variant="ornate" className={`relative overflow-hidden p-10 text-center ${className}`}>
        {/* petal confetti burst */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: 16 }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ y: -20, x: `${(i * 61) % 100}%`, opacity: 1, rotate: 0 }}
              animate={{ y: 320, rotate: 300, opacity: 0 }}
              transition={{ duration: 2.4 + (i % 4) * 0.5, delay: (i % 5) * 0.15, ease: "easeIn" }}
              className="absolute top-0"
            >
              <Marigold className="size-4 text-accent" />
            </motion.span>
          ))}
        </div>
        <Marigold aria-hidden className="mx-auto size-10 text-accent" />
        <h3 className="mt-3 type-h2 text-primary">Thank you{name ? `, ${name}` : ""}!</h3>
        <p className="mt-2 type-body-lg text-muted">
          {attending === "yes"
            ? "Your presence will make our celebration complete. See you there!"
            : attending === "maybe"
              ? "We've noted it — confirm whenever you can."
              : "We'll miss you — thank you for your blessings."}
        </p>
      </Card>
    );
  }

  return (
    <Card variant="ornate" className={`p-6 sm:p-8 ${className}`}>
      <div className="flex flex-col gap-6">
        <Input label="Your name" placeholder="e.g. Rahul & Family" value={name} onChange={(e) => setName(e.target.value)} />

        <fieldset>
          <legend className="type-overline mb-2">Will you attend?</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {attendOptions.map((o) => (
              <label
                key={o.value}
                className={`cursor-pointer rounded-card border p-4 text-center transition-all ${
                  attending === o.value ? "ornate-border bg-accent/8 shadow-gold-glow" : "border-ornate/40 hover:border-ornate"
                }`}
              >
                <input
                  type="radio"
                  name="attending"
                  value={o.value}
                  checked={attending === o.value}
                  onChange={() => setAttending(o.value)}
                  className="sr-only"
                />
                <span className="block font-display text-lg font-semibold text-primary">{o.label}</span>
                <span className="type-caption">{o.sub}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {attending !== "no" && (
          <>
            <div>
              <span className="type-overline mb-2 block">Guests attending</span>
              <div className="inline-flex items-center gap-4 rounded-pill border border-ornate/60 px-2 py-1">
                <button
                  aria-label="Fewer guests"
                  onClick={() => setHeadcount((h) => Math.max(1, h - 1))}
                  className="rounded-full p-2 hover:bg-accent/12 cursor-pointer"
                >
                  <Minus className="size-4" />
                </button>
                <span className="min-w-6 text-center font-display text-2xl font-semibold text-primary">{headcount}</span>
                <button
                  aria-label="More guests"
                  onClick={() => setHeadcount((h) => Math.min(12, h + 1))}
                  className="rounded-full p-2 hover:bg-accent/12 cursor-pointer"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            <fieldset>
              <legend className="type-overline mb-2">Which events?</legend>
              <div className="flex flex-wrap gap-2">
                {events.map((ev) => {
                  const on = selEvents.includes(ev.id);
                  return (
                    <label
                      key={ev.id}
                      className={`cursor-pointer rounded-pill border px-4 py-1.5 text-sm font-semibold transition-colors ${
                        on ? "border-ornate bg-primary text-bg" : "border-ornate/40 text-muted hover:text-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setSelEvents((cur) => (on ? cur.filter((id) => id !== ev.id) : [...cur, ev.id]))
                        }
                        className="sr-only"
                      />
                      {ev.name}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="type-overline mb-2">Meal preference</legend>
              <div className="flex flex-wrap gap-2">
                {mealOptions.map((m) => (
                  <label
                    key={m}
                    className={`cursor-pointer rounded-pill border px-4 py-1.5 text-sm font-semibold transition-colors ${
                      meal === m ? "border-ornate bg-accent/15 text-foreground" : "border-ornate/40 text-muted hover:text-foreground"
                    }`}
                  >
                    <input type="radio" name="meal" checked={meal === m} onChange={() => setMeal(m)} className="sr-only" />
                    {m}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}

        <Textarea
          label="A message for the couple"
          placeholder="Wishing you both…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        {error && (
          <p role="alert" className="text-center type-caption text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <Button
          variant="celebration"
          size="lg"
          onClick={submit}
          loading={busy}
          className="self-center"
        >
          Send RSVP
        </Button>
      </div>
    </Card>
  );
}
