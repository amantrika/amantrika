"use client";

import type { ReactNode } from "react";
import type { Theme } from "@/themes";
import { motifs } from "../motifs";
import { PatternBackground } from "../patterns";
import { CoupleMonogram } from "./CoupleMonogram";

/**
 * HERO VARIANTS — the opening spread, seven ways.
 *
 * This is the largest single lever a theme has, because for most guests the
 * hero is the whole invitation: they open the link, look once, and scroll only
 * if it earned it. `theme.layout.hero` picks the variant; nothing here knows
 * which theme it is rendering.
 */

export interface HeroProps {
  theme: Theme;
  /** One name for a solo celebration, two for a wedding, more for a joint event. */
  names: string[];
  initials?: [string, string];
  dateLabel: string;
  city: string;
  hashtag?: string;
  guestName?: string;
  /** Word set between the first two names. "weds" for a wedding, "&" elsewhere. */
  joiner?: string;
  /** Used by the photographic variants. They fall back to a patterned ground. */
  photoUrl?: string;
  /** Alt text for `photoUrl`. Required whenever a photo is supplied. */
  photoAlt?: string;
}

export function ThemedHeroVariant(props: HeroProps) {
  switch (props.theme.layout.hero) {
    case "arch-window":
      return <ArchWindowHero {...props} />;
    case "split-portrait":
      return <SplitPortraitHero {...props} />;
    case "full-bleed-photo":
      return <FullBleedPhotoHero {...props} />;
    case "banner-scroll":
      return <BannerScrollHero {...props} />;
    case "minimal-type":
      return <MinimalTypeHero {...props} />;
    case "verse-first":
      return <VerseFirstHero {...props} />;
    case "centered-monogram":
    default:
      return <CenteredMonogramHero {...props} />;
  }
}

/* ---------- shared pieces ---------- */

function Names({
  names,
  joiner = "weds",
  className = "",
}: {
  names: string[];
  joiner?: string;
  className?: string;
}) {
  return (
    <h1 className={`type-display-xl text-primary ${className}`}>
      {names[0]}
      {names.slice(1).map((name, i) => (
        <span key={name}>
          <span className="mx-3 type-accent-face text-accent sm:mx-5" style={{ fontSize: "0.5em" }}>
            {i === 0 ? joiner : "&"}
          </span>
          {name}
        </span>
      ))}
    </h1>
  );
}

function Greeting({ theme, className = "" }: { theme: Theme; className?: string }) {
  return (
    <p
      className={`type-greeting text-accent ${className}`}
      dir={theme.greetingScript === "arabic" ? "rtl" : undefined}
    >
      {theme.greetingCopy}
    </p>
  );
}

function Meta({
  dateLabel,
  city,
  hashtag,
  className = "",
}: {
  dateLabel: string;
  city: string;
  hashtag?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="type-overline">
        {dateLabel}
        {city && ` · ${city}`}
      </p>
      {hashtag && <p className="mt-2 type-body-lg text-muted">{hashtag}</p>}
    </div>
  );
}

function GuestLine({ guestName }: { guestName?: string }) {
  if (!guestName) return null;
  return (
    <p className="mt-4 type-accent-face text-xl text-muted">
      Dear {guestName}, we would be honoured by your presence.
    </p>
  );
}

/** The pattern wash every non-photographic hero sits on. */
function HeroPattern({ theme }: { theme: Theme }) {
  return (
    <PatternBackground
      name={theme.pattern}
      className="text-accent"
      style={{ opacity: "var(--pattern-opacity-panel)", zIndex: "var(--z-pattern)" }}
    />
  );
}

function HeroShell({
  theme,
  children,
  className = "",
  textured = true,
}: {
  theme: Theme;
  children: ReactNode;
  className?: string;
  textured?: boolean;
}) {
  return (
    <section
      className={`relative overflow-hidden ${textured ? theme.texture : ""} ${className}`}
    >
      {children}
    </section>
  );
}

/* ---------- 1 · centered-monogram ---------- */

function CenteredMonogramHero({ theme, names, initials, dateLabel, city, hashtag, guestName, joiner }: HeroProps) {
  return (
    <HeroShell
      theme={theme}
      className="flex min-h-[92vh] flex-col items-center justify-center px-4 pt-16 text-center"
    >
      <HeroPattern theme={theme} />
      <div className="relative flex flex-col items-center" style={{ zIndex: "var(--z-content)" }}>
        <CoupleMonogram
          initials={initials ?? ["A", "A"]}
          ring={theme.monogramRing}
          className="size-28 text-accent sm:size-36"
          title="Monogram"
        />
        <Greeting theme={theme} className="mt-6 text-2xl" />
        <Names names={names} joiner={joiner} className="mt-4" />
        <GuestLine guestName={guestName} />
        <Meta dateLabel={dateLabel} city={city} hashtag={hashtag} className="mt-6" />
      </div>
    </HeroShell>
  );
}

/* ---------- 2 · arch-window ---------- */

/**
 * Names framed inside a Mughal/temple arch cut out of a patterned ground. The
 * arch is `--radius-arch`, so it takes the theme's own curve.
 */
function ArchWindowHero({ theme, names, initials, dateLabel, city, hashtag, guestName, joiner }: HeroProps) {
  const Accent = motifs[theme.motifSet.accent];
  return (
    <HeroShell
      theme={theme}
      className="flex min-h-[94vh] items-center justify-center px-4 py-16"
    >
      <HeroPattern theme={theme} />
      <div
        className="relative mx-auto flex w-full max-w-xl flex-col items-center border border-ornate/50 bg-surface/85 px-6 pb-12 pt-20 text-center backdrop-blur-[1px]"
        style={{ zIndex: "var(--z-content)", borderRadius: "var(--radius-arch)" }}
      >
        <Accent aria-hidden className="size-14 text-accent" />
        <Greeting theme={theme} className="mt-5 text-xl" />
        <Names names={names} joiner={joiner} className="mt-4" />
        {initials && <span className="sr-only">{initials.join(" and ")}</span>}
        <GuestLine guestName={guestName} />
        <span className="gold-rule mt-8 w-24" />
        <Meta dateLabel={dateLabel} city={city} hashtag={hashtag} className="mt-6" />
      </div>
    </HeroShell>
  );
}

/* ---------- 3 · split-portrait ---------- */

/** Photograph beside the names on desktop, stacked above them on a phone. */
function SplitPortraitHero({ theme, names, dateLabel, city, hashtag, guestName, joiner, photoUrl, photoAlt }: HeroProps) {
  return (
    <HeroShell theme={theme} className="min-h-[92vh]" textured={false}>
      <div className="grid min-h-[92vh] grid-cols-1 lg:grid-cols-2">
        <div className="relative order-1 min-h-[42vh] lg:order-none lg:min-h-full">
          {photoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={photoUrl}
              alt={photoAlt ?? ""}
              width={900}
              height={1200}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className={`absolute inset-0 ${theme.texture}`}>
              <HeroPattern theme={theme} />
            </div>
          )}
        </div>
        <div
          className={`relative order-2 flex flex-col items-center justify-center px-6 py-16 text-center lg:order-none ${theme.texture}`}
        >
          <HeroPattern theme={theme} />
          <div className="relative" style={{ zIndex: "var(--z-content)" }}>
            <Greeting theme={theme} className="text-xl" />
            <Names names={names} joiner={joiner} className="mt-4" />
            <GuestLine guestName={guestName} />
            <Meta dateLabel={dateLabel} city={city} hashtag={hashtag} className="mt-8" />
          </div>
        </div>
      </div>
    </HeroShell>
  );
}

/* ---------- 4 · full-bleed-photo ---------- */

/**
 * Photograph edge to edge with the names over a scrim. The scrim is opaque
 * enough to carry text at AA on any photograph, which is why it is a flat
 * overlay rather than a gradient that happens to look good on the demo image.
 */
function FullBleedPhotoHero({ theme, names, dateLabel, city, hashtag, guestName, joiner, photoUrl, photoAlt }: HeroProps) {
  return (
    <HeroShell theme={theme} className="flex min-h-[96vh] items-end" textured={!photoUrl}>
      {photoUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={photoAlt ?? ""}
            width={1600}
            height={2000}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-overlay" aria-hidden />
        </>
      ) : (
        <HeroPattern theme={theme} />
      )}

      <div
        className="relative w-full px-6 pb-20 text-center"
        style={{ zIndex: "var(--z-content)" }}
        data-surface={photoUrl ? "inverted" : undefined}
      >
        <Greeting theme={theme} className="text-xl" />
        <Names names={names} joiner={joiner} className="mt-4" />
        <GuestLine guestName={guestName} />
        <Meta dateLabel={dateLabel} city={city} hashtag={hashtag} className="mt-6" />
      </div>
    </HeroShell>
  );
}

/* ---------- 5 · banner-scroll ---------- */

/** A horizontal band of motif above and below the names, like a printed scroll. */
function BannerScrollHero({ theme, names, dateLabel, city, hashtag, guestName, joiner }: HeroProps) {
  const Corner = motifs[theme.motifSet.corner];
  return (
    <HeroShell
      theme={theme}
      className="flex min-h-[88vh] flex-col items-center justify-center px-4 py-16 text-center"
    >
      <HeroPattern theme={theme} />
      <div className="relative w-full" style={{ zIndex: "var(--z-content)" }}>
        <div
          data-surface="inverted"
          className="flex items-center justify-center gap-6 px-4 py-6"
        >
          <Corner aria-hidden className="size-10 text-accent" />
          <Greeting theme={theme} className="text-2xl" />
          <Corner aria-hidden className="size-10 scale-x-[-1] text-accent" />
        </div>

        <div className="mx-auto max-w-4xl px-4 py-12">
          <Names names={names} joiner={joiner} />
          <GuestLine guestName={guestName} />
        </div>

        <div data-surface="inverted" className="px-4 py-5">
          <Meta dateLabel={dateLabel} city={city} hashtag={hashtag} />
        </div>
      </div>
    </HeroShell>
  );
}

/* ---------- 6 · minimal-type ---------- */

/** No motif, no monogram, no pattern. The names and three lines of fact. */
function MinimalTypeHero({ theme, names, dateLabel, city, hashtag, guestName, joiner }: HeroProps) {
  return (
    <HeroShell
      theme={theme}
      className="flex min-h-[90vh] flex-col items-center justify-center px-6 text-center"
      textured={false}
    >
      <div className="max-w-3xl">
        <Greeting theme={theme} className="type-overline !text-accent" />
        <Names names={names} joiner={joiner} className="mt-10" />
        <GuestLine guestName={guestName} />
        <span className="gold-rule mx-auto mt-12 block w-16" />
        <Meta dateLabel={dateLabel} city={city} hashtag={hashtag} className="mt-8" />
      </div>
    </HeroShell>
  );
}

/* ---------- 7 · verse-first ---------- */

/**
 * Scripture or greeting leads at full size and the names follow, smaller. The
 * shape of a traditional South Indian or Nikah card, where the invocation
 * outranks the couple.
 */
function VerseFirstHero({ theme, names, dateLabel, city, hashtag, guestName, joiner }: HeroProps) {
  const Accent = motifs[theme.motifSet.accent];
  return (
    <HeroShell
      theme={theme}
      className="flex min-h-[90vh] flex-col items-center justify-center px-4 py-16 text-center"
    >
      <HeroPattern theme={theme} />
      <div className="relative max-w-2xl" style={{ zIndex: "var(--z-content)" }}>
        <Accent aria-hidden className="mx-auto size-12 text-accent" />
        <p
          className="mt-8 type-greeting text-primary"
          style={{ fontSize: "var(--text-display-lg)", lineHeight: 1.35 }}
          dir={theme.greetingScript === "arabic" ? "rtl" : undefined}
        >
          {theme.greetingCopy}
        </p>
        <span className="gold-rule mx-auto mt-10 block w-24" />
        <Names names={names} joiner={joiner} className="mt-10 !text-[length:var(--text-h1)]" />
        <GuestLine guestName={guestName} />
        <Meta dateLabel={dateLabel} city={city} hashtag={hashtag} className="mt-8" />
      </div>
    </HeroShell>
  );
}
