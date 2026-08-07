"use client";

import { useEffect, useState } from "react";
import { Music, VolumeX, MapPin, Gift, Copy } from "lucide-react";
import type { Blessing } from "@/data/blessings";
import { store } from "@/lib/store";
import { Card } from "./Card";
import { Button } from "./Button";
import { Input, Textarea } from "./fields";
import { Marigold } from "../motifs";

/** BlessingsWall, MusicToggle, GiftBlock, MapEmbedPlaceholder. */

export function BlessingsWall({
  seed,
  onSubmit,
  className = "",
}: {
  /** Blessings already posted — from the database, or the bundled demo set. */
  seed: Blessing[];
  /** Persist a new blessing. Omit to fall back to the localStorage demo store. */
  onSubmit?: (blessing: { name: string; message: string }) => Promise<{
    ok: boolean;
    error?: string;
    notice?: string;
  }>;
  className?: string;
}) {
  const [local, setLocal] = useState<Blessing[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  // Only the demo store is read client-side; real blessings arrive via `seed`.
  useEffect(() => {
    if (!onSubmit) setLocal(store.getBlessings());
  }, [onSubmit]);

  const add = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const author = name.trim() || "A well-wisher";

    if (!onSubmit) {
      const b: Blessing = { id: `lb${Date.now()}`, name: author, message: trimmed };
      store.addBlessing(b);
      setLocal((cur) => [b, ...cur]);
      reset();
      return;
    }

    setBusy(true);
    setFeedback(null);
    const result = await onSubmit({ name: author, message: trimmed });
    setBusy(false);

    if (!result.ok) {
      setFeedback({ text: result.error ?? "Couldn't post that. Try again.", isError: true });
      return;
    }
    // Optimistic: a moderated blessing won't come back from the server yet.
    if (!result.notice) {
      setLocal((cur) => [{ id: `lb${Date.now()}`, name: author, message: trimmed }, ...cur]);
    } else {
      setFeedback({ text: result.notice, isError: false });
    }
    reset();
  };

  function reset() {
    setName("");
    setMessage("");
    setAdding(false);
  }

  const all = [...local, ...seed];

  return (
    <div className={className}>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
        {all.map((b) => (
          <Card key={b.id} className="p-5">
            <Marigold aria-hidden className="size-5 text-accent" />
            <p className="mt-2 type-body">{b.message}</p>
            <p className="mt-3 type-verse text-primary">— {b.name}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 text-center">
        {adding ? (
          <Card variant="ornate" className="mx-auto max-w-md p-6 text-left">
            <div className="flex flex-col gap-4">
              <Input label="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              <Textarea label="Your blessing" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
                <Button onClick={add} loading={busy}>
                  Add blessing
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            Add your blessing
          </Button>
        )}
        {feedback && (
          <p
            role={feedback.isError ? "alert" : "status"}
            className={`mt-3 type-caption ${feedback.isError ? "text-red-600 dark:text-red-400" : "text-muted"}`}
          >
            {feedback.text}
          </p>
        )}
      </div>
    </div>
  );
}

/** Floating shehnai/mute toggle; pulses subtly while "playing" (no real audio). */
export function MusicToggle({ className = "" }: { className?: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <button
      onClick={() => setPlaying((p) => !p)}
      aria-label={playing ? "Mute music" : "Play music"}
      aria-pressed={playing}
      className={`fixed bottom-5 left-5 z-40 flex size-12 items-center justify-center rounded-full border border-ornate bg-surface text-primary shadow-lifted transition-shadow hover:shadow-gold-glow cursor-pointer ${
        playing ? "diya-flicker" : ""
      } ${className}`}
    >
      {playing ? <Music className="size-5" /> : <VolumeX className="size-5" />}
    </button>
  );
}

export function GiftBlock({ upiId = "swarnil.prachi@demo-upi", className = "" }: { upiId?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <Card variant="envelope" className={`p-6 text-center ${className}`}>
      <Gift aria-hidden className="mx-auto size-6 text-accent" />
      <p className="mt-2 type-verse">Your blessings are our greatest gift.</p>
      <p className="mt-1 type-caption">Should you wish to send one anyway:</p>
      <button
        onClick={copy}
        className="mt-3 inline-flex items-center gap-2 rounded-pill border border-ornate/60 px-4 py-1.5 text-sm font-semibold text-primary hover:bg-accent/10 cursor-pointer"
      >
        <Copy className="size-3.5" /> {copied ? "Copied!" : upiId}
      </button>
    </Card>
  );
}

/** Stylized static map illustration — no map SDK. */
export function MapEmbedPlaceholder({
  venue,
  address,
  className = "",
}: {
  venue: string;
  address: string;
  className?: string;
}) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="relative h-40 w-full bg-accent/10">
        <svg aria-hidden viewBox="0 0 400 160" className="absolute inset-0 size-full text-ornate/40">
          <path d="M0 40c60 10 90-25 150-15s80 45 140 40 80-30 110-25" fill="none" stroke="currentColor" strokeWidth="10" opacity=".5" />
          <path d="M0 110c70-15 110 20 180 12s90-40 160-30 60 25 60 25" fill="none" stroke="currentColor" strokeWidth="6" opacity=".4" />
          <path d="M60 0v160M180 0v160M300 0v160" stroke="currentColor" strokeWidth="2" opacity=".25" />
        </svg>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
          <MapPin className="size-9 text-primary drop-shadow" fill="var(--color-accent)" />
        </span>
      </div>
      <div className="p-5">
        <h4 className="type-h3 text-primary">{venue}</h4>
        <p className="type-caption">{address}</p>
        <a
          href={`https://www.google.com/maps/search/${encodeURIComponent(`${venue} ${address}`)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm font-semibold text-primary hover:text-accent"
        >
          Open in Maps →
        </a>
      </div>
    </Card>
  );
}
