"use client";

import type { FrameStyle } from "@/themes";

/**
 * Themed photo frame around a picsum placeholder.
 * Variants: arch (Mughal arch mask), scallop, circle, polaroid.
 * Gentle 3° tilt on hover (disabled under reduced motion via CSS).
 * @example <PhotoFrame seed="swpr1" variant="arch" caption="Jaipur, 2024" />
 */
export function PhotoFrame({
  seed,
  variant = "arch",
  caption,
  width = 320,
  height = 400,
  className = "",
}: {
  seed: string;
  variant?: FrameStyle;
  caption?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const src = `https://picsum.photos/seed/${seed}/${width}/${height}`;
  const shapeCls =
    variant === "arch"
      ? "radius-arch"
      : variant === "circle"
        ? "rounded-full aspect-square"
        : variant === "scallop"
          ? "rounded-card"
          : "rounded-[2px]";

  return (
    <figure
      className={`group inline-block transition-transform duration-300 motion-safe:hover:rotate-3 motion-safe:hover:scale-[1.02] ${className}`}
    >
      <div
        className={`overflow-hidden border-4 border-raised shadow-lifted outline outline-1 outline-ornate/50 ${shapeCls} ${
          variant === "polaroid" ? "bg-raised p-2 pb-10" : ""
        }`}
        style={
          variant === "scallop"
            ? { clipPath: "polygon(0 6%, 6% 0, 94% 0, 100% 6%, 100% 94%, 94% 100%, 6% 100%, 0 94%)" }
            : undefined
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={caption ?? "Couple photograph"}
          width={width}
          height={height}
          loading="lazy"
          className={`block size-full object-cover ${variant === "circle" ? "aspect-square" : ""}`}
        />
      </div>
      {caption && <figcaption className="mt-2 text-center type-verse text-muted">{caption}</figcaption>}
    </figure>
  );
}
