"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Copy, MessageCircle } from "lucide-react";
import { getCouple, type CoupleData } from "@/data/couples";
import { seedBlessings } from "@/data/blessings";
import { getTheme } from "@/themes";
import { store } from "@/lib/store";
import Link from "next/link";
import { useTheme } from "@/design-system/ThemeProvider";
import {
  BlessingsWall, Card, CoupleMonogram, CountdownTimer, Divider, Envelope, EventTimelineItem,
  GiftBlock, MapEmbedPlaceholder, MusicToggle, PetalRain, PhotoFrame, RSVPForm,
} from "@/design-system/components";
import { fadeUpStagger, staggerContainer } from "@/design-system/motion/presets";

/** Scroll-revealed section with ornate motif divider above it. */
function Section({ id, overline, title, divider, children }: {
  id: string;
  overline?: string;
  title?: string;
  divider: Parameters<typeof Divider>[0]["motif"];
  children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="mx-auto w-full max-w-4xl px-4"
      style={{ marginTop: "var(--space-section-gap)" }}
    >
      <Divider variant="motif" motif={divider} className="mb-10" />
      {(overline || title) && (
        <motion.header variants={fadeUpStagger} className="mb-8 text-center">
          {overline && <p className="type-overline">{overline}</p>}
          {title && <h2 className="mt-1 type-display-lg shimmer-gold">{title}</h2>}
        </motion.header>
      )}
      {children}
    </motion.section>
  );
}

export function InviteClient({ slug }: { slug: string }) {
  const search = useSearchParams();
  const reduced = useReducedMotion();
  const { setThemeId } = useTheme();
  const [opened, setOpened] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [couple, setCouple] = useState<CoupleData>(() => getCouple(slug));

  const guestName = search.get("g") ?? undefined;
  const themeOverride = search.get("theme");

  // live invite from onboarding wins over mock data for its own slug
  useEffect(() => {
    const live = store.getLiveInvite();
    if (live && live.slug === slug) setCouple(live);
  }, [slug]);

  const theme = getTheme(themeOverride ?? couple.themeId);
  useEffect(() => setThemeId(theme.id), [theme.id, setThemeId]);

  useEffect(() => {
    if (reduced) setOpened(true);
  }, [reduced]);

  const initials: [string, string] = [couple.partner1.name[0] ?? "A", couple.partner2.name[0] ?? "A"];
  const hiddenSections = useMemo(() => new Set((couple as CoupleData & { hiddenSections?: string[] }).hiddenSections ?? []), [couple]);

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href.split("?")[0]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!opened) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="w-full">
          <p className="mb-8 text-center type-overline">
            {couple.partner1.name} &amp; {couple.partner2.name} invite you
          </p>
          <Envelope
            guestName={guestName ? `Dear ${guestName}` : "With love, to you & yours"}
            sealMonogram={`${initials[0]}·${initials[1]}`}
            onOpened={() => setOpened(true)}
          />
        </div>
      </div>
    );
  }

  const mainDateLabel = new Date(couple.mainDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-bg pb-24"
    >
      <PetalRain type={theme.petalType} density={12} />
      <MusicToggle />

      {/* 1 · HERO */}
      <section className="mx-auto flex min-h-[92vh] w-full max-w-4xl flex-col items-center justify-center px-4 pt-16 text-center">
        <CoupleMonogram initials={initials} ring={theme.monogramRing} className="size-28 text-accent sm:size-36" title="Couple monogram" />
        <p className={`mt-6 text-2xl text-accent ${theme.greetingScript === "arabic" ? "font-arabic" : theme.greetingScript === "devanagari" ? "font-deva" : "type-verse"}`}
           dir={theme.greetingScript === "arabic" ? "rtl" : undefined}>
          {theme.greetingCopy}
        </p>
        <h1 className="mt-4 type-display-xl text-primary">
          {couple.partner1.name}
          <span className="mx-3 type-verse text-accent sm:mx-5" style={{ fontSize: "0.5em" }}>weds</span>
          {couple.partner2.name}
        </h1>
        {guestName && <p className="mt-4 type-verse text-muted">Dear {guestName}, we would be honoured by your presence.</p>}
        <p className="mt-6 type-overline">{mainDateLabel} · {couple.city}</p>
        <p className="mt-2 type-body-lg text-muted">{couple.hashtag}</p>
      </section>

      {/* 2 · COUNTDOWN */}
      <Section id="countdown" divider={theme.motifSet.divider} overline="The celebration begins in">
        <motion.div variants={fadeUpStagger}>
          <CountdownTimer target={couple.mainDate} />
        </motion.div>
      </Section>

      {/* 3 · OUR STORY */}
      <Section id="story" divider={theme.motifSet.accent} overline="Two families, one story" title="Our Story">
        <motion.p variants={fadeUpStagger} className="mx-auto max-w-2xl text-center type-verse">
          {couple.story}
        </motion.p>
        <motion.div variants={fadeUpStagger} className="mt-10 flex flex-wrap items-end justify-center gap-8">
          <PhotoFrame seed={couple.photos[0]} variant={theme.frameStyle} width={260} height={330} caption="How it started" />
          <PhotoFrame seed={couple.photos[1]} variant={theme.frameStyle} width={260} height={330} caption="How it's going" />
        </motion.div>
        <div className="mx-auto mt-10 flex max-w-md flex-col gap-5">
          {couple.storyMoments.map((m, i) => (
            <motion.div key={m.title} variants={fadeUpStagger} custom={i} className="border-l-2 border-ornate pl-4">
              <h3 className="type-h3 text-primary">{m.title}</h3>
              <p className="type-body text-muted">{m.text}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* 4 · EVENTS */}
      <Section id="events" divider={theme.motifSet.divider} overline="Join us for" title="The Celebrations">
        <div className="flex flex-col gap-5">
          {couple.events.map((ev, i) => (
            <motion.div key={ev.id} variants={fadeUpStagger} custom={i}>
              <EventTimelineItem event={ev} />
            </motion.div>
          ))}
        </div>
      </Section>

      {/* 5 · FAMILY */}
      <Section id="family" divider={theme.motifSet.accent} overline="With the blessings of" title="Our Families">
        <div className="grid gap-5 sm:grid-cols-2">
          {(couple.side === "bride"
            ? [couple.partner2, couple.partner1]
            : [couple.partner1, couple.partner2]
          ).map((p, i) => (
            <motion.div key={p.name} variants={fadeUpStagger} custom={i}>
              <Card variant="ornate" className="p-8 text-center">
                <p className="type-overline">{i === 0 ? "Together with" : "And"}</p>
                <h3 className="mt-2 type-h1 text-primary">{p.family}</h3>
                <p className="mt-1 type-verse text-muted">parents &amp; family of {p.name}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* 6 · GALLERY */}
      <Section id="gallery" divider={theme.motifSet.divider} overline="Moments" title="Gallery">
        <div className="columns-2 gap-4 sm:columns-3 [&>*]:mb-4">
          {couple.photos.slice(0, 8).map((seed, i) => (
            <motion.button
              key={seed}
              variants={fadeUpStagger}
              custom={i}
              onClick={() => setLightbox(seed)}
              className="block w-full cursor-pointer break-inside-avoid"
              aria-label={`View photo ${i + 1} full size`}
            >
              <PhotoFrame seed={seed} variant={theme.frameStyle} width={300} height={i % 2 ? 380 : 300} className="w-full [&_img]:w-full" />
            </motion.button>
          ))}
        </div>
        {lightbox && (
          <button
            className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-overlay p-6"
            onClick={() => setLightbox(null)}
            aria-label="Close photo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://picsum.photos/seed/${lightbox}/900/1100`} alt="Couple photograph, enlarged" className="max-h-full max-w-full rounded-card shadow-lifted" />
          </button>
        )}
      </Section>

      {/* 7 · RSVP */}
      <Section id="rsvp" divider={theme.motifSet.accent} overline="Kindly respond" title="RSVP">
        <motion.div variants={fadeUpStagger}>
          <RSVPForm events={couple.events} mealOptions={theme.mealOptions} guestName={guestName ?? ""} />
        </motion.div>
      </Section>

      {/* 8 · BLESSINGS */}
      {!hiddenSections.has("blessings") && (
        <Section id="blessings" divider={theme.motifSet.divider} overline="From loved ones" title="Blessings Wall">
          <motion.div variants={fadeUpStagger}>
            <BlessingsWall seed={seedBlessings} />
          </motion.div>
        </Section>
      )}

      {/* 9 · TRAVEL & VENUE */}
      <Section id="travel" divider={theme.motifSet.accent} overline="Getting there" title="Travel & Venue">
        <div className="grid gap-5 sm:grid-cols-2">
          {[...new Map(couple.events.map((e) => [e.venue, e])).values()].slice(0, 2).map((ev, i) => (
            <motion.div key={ev.venue} variants={fadeUpStagger} custom={i}>
              <MapEmbedPlaceholder venue={ev.venue} address={ev.address} />
            </motion.div>
          ))}
        </div>
        <motion.div variants={fadeUpStagger} className="mt-8">
          <h3 className="mb-4 text-center type-h2 text-primary">Where to stay</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {couple.hotels.map((h) => (
              <Card key={h.name} className="p-5 text-center">
                <p className="font-semibold text-primary">{h.name}</p>
                <p className="type-caption">{h.distance}</p>
                <p className="type-caption">{h.phone}</p>
              </Card>
            ))}
          </div>
        </motion.div>
        <motion.div variants={fadeUpStagger} className="mt-8 text-center">
          <p className="type-overline mb-3">Dress codes</p>
          <div className="flex flex-wrap justify-center gap-2">
            {couple.events.filter((e) => e.dressCode).map((e) => (
              <span key={e.id} className="rounded-pill border border-ornate/60 px-4 py-1.5 text-sm">
                <strong>{e.name}:</strong> {e.dressCode}
              </span>
            ))}
          </div>
        </motion.div>
      </Section>

      {/* FOOTER */}
      <footer className="mx-auto mt-24 w-full max-w-4xl px-4 text-center">
        <Divider variant="motif" motif={theme.motifSet.divider} className="mb-10" />
        <p className="type-h2 text-primary">{couple.hashtag}</p>
        {!hiddenSections.has("gift") && <GiftBlock className="mx-auto mt-8 max-w-md" />}
        <div className="mt-8 flex justify-center gap-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`You're invited! ${couple.partner1.name} weds ${couple.partner2.name} — `)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-pill border border-ornate/60 px-5 py-2 text-sm font-semibold text-primary hover:bg-accent/10"
          >
            <MessageCircle className="size-4" /> Share on WhatsApp
          </a>
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-2 rounded-pill border border-ornate/60 px-5 py-2 text-sm font-semibold text-primary hover:bg-accent/10 cursor-pointer"
          >
            <Copy className="size-4" /> {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
        <Link href="/" className="mt-10 inline-block">
          <span className="type-caption">Crafted with</span>{" "}
          <span className="font-display text-lg font-semibold text-primary">Amantrika</span>
        </Link>
      </footer>
    </motion.div>
  );
}
