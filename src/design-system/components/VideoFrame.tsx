"use client";

import { useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { FrameStyle } from "@/themes";
import { CornerFlourish } from "./ornaments";

/**
 * VideoFrame — an ornate video player for save-the-date films and pre-wedding
 * reels. Uses a real <video> with a poster image (picsum placeholder) and
 * custom gold controls; falls back to a still frame if the src is omitted.
 *
 * Frame styles match PhotoFrame so a gallery can mix stills and film.
 * @example <VideoFrame posterSeed="film1" variant="arch" caption="Our save-the-date" />
 */
export function VideoFrame({
  src,
  posterSeed,
  variant = "arch",
  caption,
  width = 640,
  height = 360,
  className = "",
}: {
  /** any mp4/webm URL; omit for a poster-only placeholder */
  src?: string;
  posterSeed: string;
  variant?: FrameStyle;
  caption?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const poster = `https://picsum.photos/seed/${posterSeed}/${width}/${height}`;

  const toggle = () => {
    const v = ref.current;
    if (!v) {
      setPlaying((p) => !p); // placeholder mode
      return;
    }
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const shapeCls =
    variant === "arch" ? "radius-arch" : variant === "circle" ? "rounded-full" : variant === "scallop" ? "rounded-card" : "rounded-[2px]";

  return (
    <figure className={`relative inline-block ${className}`}>
      <div className={`relative overflow-hidden border-4 border-raised shadow-lifted outline outline-1 outline-ornate/50 ${shapeCls}`}>
        {src ? (
          <video
            ref={ref}
            src={src}
            poster={poster}
            muted={muted}
            loop
            playsInline
            width={width}
            height={height}
            className="block size-full object-cover"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={caption ?? "Wedding film still"} width={width} height={height} className="block size-full object-cover" />
        )}

        {/* vignette so gold controls stay legible */}
        <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 55%, color-mix(in srgb, var(--color-overlay) 85%, transparent) 100%)" }} />

        {/* centre play button */}
        {!playing && (
          <button
            onClick={toggle}
            aria-label="Play film"
            className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-accent bg-overlay text-bg backdrop-blur-sm transition-shadow hover:shadow-gold-glow cursor-pointer"
          >
            <Play className="size-7 translate-x-0.5" fill="currentColor" />
          </button>
        )}

        {/* bottom controls */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-3">
          <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="rounded-full p-1.5 text-bg hover:bg-bg/20 cursor-pointer">
            {playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="size-4" fill="currentColor" />}
          </button>
          <button
            onClick={() => {
              setMuted((m) => {
                if (ref.current) ref.current.muted = !m;
                return !m;
              });
            }}
            aria-label={muted ? "Unmute" : "Mute"}
            className="rounded-full p-1.5 text-bg hover:bg-bg/20 cursor-pointer"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-bg/30">
            <span className={`block h-full rounded-full bg-accent transition-all duration-1000 ${playing ? "w-full" : "w-0"}`} />
          </span>
        </div>

        {/* ornate corners on rectangular frames */}
        {variant !== "circle" && (
          <>
            <CornerFlourish corner="top-left" className="pointer-events-none absolute left-1 top-1 size-8 text-accent/70" />
            <CornerFlourish corner="top-right" className="pointer-events-none absolute right-1 top-1 size-8 text-accent/70" />
          </>
        )}
      </div>
      {caption && <figcaption className="mt-2 text-center type-accent-face text-lg text-muted">{caption}</figcaption>}
    </figure>
  );
}

/**
 * VideoHero — a full-width cinematic band with the film behind an overlaid
 * title. Used for "watch our story" moments between sections.
 */
export function VideoHero({
  posterSeed,
  src,
  title,
  subtitle,
  className = "",
}: {
  posterSeed: string;
  src?: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-card shadow-lifted ${className}`}>
      {src ? (
        <video src={src} poster={`https://picsum.photos/seed/${posterSeed}/1200/500`} autoPlay muted loop playsInline className="h-72 w-full object-cover sm:h-96" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`https://picsum.photos/seed/${posterSeed}/1200/500`} alt="" className="h-72 w-full object-cover sm:h-96" />
      )}
      <span aria-hidden className="absolute inset-0" style={{ background: "color-mix(in srgb, var(--color-overlay) 75%, transparent)" }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="type-display-lg text-bg">{title}</p>
        {subtitle && <p className="type-accent-face text-2xl text-accent">{subtitle}</p>}
      </div>
    </div>
  );
}
