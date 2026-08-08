"use client";

import { icons } from "@/design-system/icons";

/**
 * The waiting state, as a shehnai being played.
 *
 * A generic spinning circle says "something is happening" in the same voice as
 * every other website. A shehnai with sound rising out of it says the same thing
 * in Amantrika's voice — it is the instrument that opens an Indian wedding, so
 * waiting for an invitation to load is scored by the thing that would actually
 * be playing.
 *
 * The bars are a voice-note waveform: they rise and fall in a staggered loop, as
 * if the note were being held. Nothing rotates, so there is no illusion of
 * measurable progress where there is none.
 *
 * Under `prefers-reduced-motion` every animation stops and the waveform settles
 * into a static row — still legible as "busy", with no movement at all.
 */

const Shehnai = icons.shehnai;

/** Bar heights as fractions of the track, shaped like a held note rather than noise. */
const BARS = [0.35, 0.62, 0.9, 0.7, 0.45, 0.75, 0.55];

export type ShehnaiLoaderSize = "sm" | "md" | "lg";

const sizing: Record<ShehnaiLoaderSize, { icon: string; track: string; bar: string; gap: string }> = {
  sm: { icon: "size-4", track: "h-4", bar: "w-[2px]", gap: "gap-[2px]" },
  md: { icon: "size-6", track: "h-6", bar: "w-[3px]", gap: "gap-[3px]" },
  lg: { icon: "size-10", track: "h-10", bar: "w-1", gap: "gap-1" },
};

export function ShehnaiLoader({
  size = "md",
  label = "Loading",
  className = "",
}: {
  size?: ShehnaiLoaderSize;
  /** Announced to screen readers. Say what is loading, not just "loading". */
  label?: string;
  className?: string;
}) {
  const s = sizing[size];

  return (
    <span role="status" aria-live="polite" className={`inline-flex items-center ${s.gap} ${className}`}>
      <Shehnai aria-hidden className={`${s.icon} shrink-0 text-accent shehnai-sway`} />

      <span aria-hidden className={`inline-flex items-end ${s.gap} ${s.track}`}>
        {BARS.map((height, i) => (
          <span
            key={i}
            className={`${s.bar} shehnai-note origin-bottom rounded-full bg-accent`}
            style={{
              height: `${height * 100}%`,
              // Staggered so the note travels along the bars rather than pulsing
              // as one block.
              animationDelay: `${i * 0.11}s`,
            }}
          />
        ))}
      </span>

      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Full-width version for a panel or table that is still fetching. */
export function ShehnaiLoadingBlock({
  label = "Loading",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}>
      <ShehnaiLoader size="lg" label={label} />
      <p className="type-caption">{label}…</p>
    </div>
  );
}
