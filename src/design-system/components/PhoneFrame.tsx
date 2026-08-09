import type { CSSProperties, ReactNode } from "react";

/** Casing thickness on each side of the screen, in px. */
const BEZEL = 10;

/**
 * A phone, drawn around whatever you put in it.
 *
 * Amantrika's product is read on a phone by three hundred relatives, so a
 * preview shown on a desktop needs to say "this is what arrives on your
 * mother's phone" before it says anything else. A flat rectangle on a page does
 * not say that; a device does.
 *
 * **The screen width is load-bearing, not decoration.** Whatever sits inside —
 * here, an iframe of the live invitation — takes this element's width as its
 * viewport, so 390px means the invitation lays itself out exactly as it would
 * on an iPhone rather than as a squeezed desktop page. That is the whole reason
 * this renders at a real size instead of being scaled down with a transform:
 * a transform would keep the proportions and lie about the viewport.
 *
 * The trade that follows: on a short window the height is clamped, so the
 * device reads as a stubbier phone than it is. Correct layout inside beats
 * correct proportions outside — real phones differ in height anyway, and none
 * of them differ in width the way a broken breakpoint does.
 *
 * The greys are hardcoded, unusually for this design system. A phone is a
 * physical object and it is the same colour in every theme; running it through
 * the token layer would tint the hardware with the wedding's palette, which is
 * the one thing a device mockup must not do.
 */
export function PhoneFrame({
  children,
  /** Screen width in px. The child sees this as its viewport width. */
  width = 390,
  /**
   * Screen height — any CSS length, so a caller can clamp it against the
   * viewport (`min(844px, 70vh)`). 844 is the iPhone 14/15 logical height.
   */
  height = "844px",
  className = "",
}: {
  children: ReactNode;
  width?: number;
  height?: string;
  className?: string;
}) {
  // The *wrapper* carries the width and the screen fills it, rather than the
  // screen sizing itself against a shrink-to-fit parent. The obvious way round
  // — `w-fit` outside, `min(390px, 100%)` inside — is circular, and the browser
  // resolves it to something arbitrary: it produced a 300px viewport, which
  // quietly made every preview render at a width no phone has.
  //
  // BEZEL is the casing on each side, so the wrapper is that much wider than
  // the screen it is meant to contain.
  const outer: CSSProperties = { width: "100%", maxWidth: `${width + BEZEL * 2}px` };
  const screen: CSSProperties = { height };

  return (
    <div className={`relative mx-auto ${className}`} style={outer}>
      {/* The two side buttons. Purely drawn — they sit behind the shell so they
          read as part of the casing rather than as tabs stuck on the edge.
          Gone with the rest of the casing on a phone. */}
      <span
        aria-hidden
        className="absolute -left-[3px] top-[112px] hidden h-16 w-[3px] rounded-l-sm bg-[#2f3033] sm:block"
      />
      <span
        aria-hidden
        className="absolute -right-[3px] top-[96px] hidden h-24 w-[3px] rounded-r-sm bg-[#2f3033] sm:block"
      />

      {/* The casing. The inner ring is the polished edge that catches light on
          a real handset — one highlight, not a gradient, because more reads as
          plastic.

          Below `sm` the casing collapses to nothing: drawing a phone around a
          preview that is already being read on a phone is both redundant and
          expensive, because every pixel of bezel is a pixel the invitation does
          not get. On a 390px handset the frame version left the content 288px —
          narrower than any phone actually sold, and so a viewport the
          invitation is never designed against. */}
      <div className="rounded-card bg-transparent p-0 sm:rounded-[2.75rem] sm:bg-[#1c1c1e] sm:p-[10px] sm:shadow-lifted sm:ring-1 sm:ring-inset sm:ring-white/10">
        <div
          className="relative w-full overflow-hidden rounded-card bg-black sm:rounded-[2.15rem]"
          style={screen}
        >
          {children}

          {/* Dynamic island. Over the content and never in its way — a preview
              you cannot tap is not a preview. Part of the casing, so it goes
              with it. */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-2 hidden h-[26px] w-[95px] -translate-x-1/2 rounded-full bg-black sm:block"
          />
        </div>
      </div>
    </div>
  );
}
