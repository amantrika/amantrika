/**
 * The waiting state, as a ring.
 *
 * This used to be a shehnai with a waveform rising out of it. It was ours, but
 * it was also a symbol nobody had seen before doing the one job where being
 * unfamiliar is a cost — a person waiting wants to recognise "busy" instantly,
 * not decode it. So the *shape* is the shape everything else uses.
 *
 * The wedding is in the detail instead: the track is a dotted gold rule rather
 * than a solid grey one, the sweep is a conic arc in the theme's accent, and a
 * single bindi dot orbits the rim a half-beat behind it. It reads as a spinner
 * at a glance and as ours on a second look.
 *
 * All of the motion is CSS (see the loader block in globals.css), so this stays
 * a server component and costs no client JS anywhere it is used. Under
 * `prefers-reduced-motion` nothing travels across the screen — the arc holds
 * position and breathes.
 */

export type LoaderSize = "sm" | "md" | "lg";

const sizing: Record<LoaderSize, { box: string; weight: string; bindi: string }> = {
  sm: { box: "size-4", weight: "2px", bindi: "size-[3px]" },
  md: { box: "size-6", weight: "3px", bindi: "size-[4px]" },
  lg: { box: "size-10", weight: "4px", bindi: "size-[6px]" },
};

export function Loader({
  size = "md",
  label = "Loading",
  className = "",
}: {
  size?: LoaderSize;
  /** Announced to screen readers. Say what is loading, not just "loading". */
  label?: string;
  className?: string;
}) {
  const s = sizing[size];

  return (
    <span
      role="status"
      aria-live="polite"
      className={`relative inline-flex shrink-0 ${s.box} ${className}`}
      style={{ ["--loader-weight" as string]: s.weight }}
    >
      <span aria-hidden className="loader-track absolute inset-0" />
      <span aria-hidden className="loader-ring absolute inset-0" />

      {/* The bindi rides the rim: the wrapper spins, the dot sits on its edge.
          Only worth drawing at md and up — at 16px it collides with the arc. */}
      {size !== "sm" && (
        <span aria-hidden className="loader-bindi absolute inset-0">
          <span
            className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[1px] rounded-full bg-primary ${s.bindi}`}
          />
        </span>
      )}

      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Full-width version for a panel, a route segment or a table that is still fetching. */
export function LoadingBlock({
  label = "Loading",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}>
      <Loader size="lg" label={label} />
      <p className="type-caption">{label}…</p>
    </div>
  );
}
