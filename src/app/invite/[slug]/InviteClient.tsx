"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Copy, MessageCircle } from "lucide-react";
import Link from "next/link";
import { getTheme } from "@/themes";
import { useTheme } from "@/design-system/ThemeProvider";
import {
  BlessingsWall, CountdownTimer, Divider, EventCalendar, EventTimelineItem, FamilyTree,
  GiftBlock, MapEmbedPlaceholder, MusicToggle, OurStorySection, PetalRain, PhotoFrame,
  RSVPForm, ThemedCard, ThemedHero, ThemedOpening, VideoHero, CoupleMonogram,
} from "@/design-system/components";
import { brideFamily, groomFamily } from "@/data/families";
import { fadeUpStagger, staggerContainer } from "@/design-system/motion/presets";
import type { Blessing } from "@/data/blessings";
import { hostLine, monogramInitials, type InviteView } from "@/lib/invite";
import { submitBlessing, submitRsvp } from "./actions";

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

export function InviteClient({
  invite,
  blessings,
}: {
  invite: InviteView;
  blessings: Blessing[];
}) {
  const search = useSearchParams();
  const reduced = useReducedMotion();
  const { setThemeId } = useTheme();
  const [opened, setOpened] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const guestName = search.get("g") ?? undefined;
  const guestToken = search.get("t") ?? undefined;
  const themeOverride = search.get("theme");

  const theme = getTheme(themeOverride ?? invite.themeId);
  useEffect(() => setThemeId(theme.id), [theme.id, setThemeId]);

  useEffect(() => {
    if (reduced) setOpened(true);
  }, [reduced]);

  // Fire-and-forget view tracking; never blocks or breaks the invite.
  useEffect(() => {
    if (invite.isDemo) return;
    const controller = new AbortController();
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slug: invite.slug,
        guestToken,
        referrer: document.referrer || undefined,
      }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {});
    return () => controller.abort();
  }, [invite.slug, invite.isDemo, guestToken]);

  const names = hostLine(invite.hosts);
  const initials = monogramInitials(invite.hosts);
  const [first, second] = invite.hosts;
  const rsvpEnabled = invite.settings.rsvpEnabled !== false;
  const blessingsEnabled = invite.settings.blessingsEnabled !== false;

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href.split("?")[0]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!opened) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="w-full">
          <p className="mb-8 text-center type-overline">{names} invite you</p>
          <ThemedOpening
            theme={theme}
            initials={initials}
            guestName={guestName ?? undefined}
            onOpened={() => setOpened(true)}
          />
        </div>
      </div>
    );
  }

  const mainDateLabel = new Date(invite.mainDate).toLocaleDateString("en-IN", {
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
      <ThemedHero
        theme={theme}
        names={invite.hosts.map((h) => h.name)}
        joiner={invite.eventType === "wedding" ? "weds" : "&"}
        initials={initials}
        dateLabel={mainDateLabel}
        city={invite.city}
        hashtag={invite.hashtag}
        guestName={guestName}
      >
        <CoupleMonogram
          initials={initials}
          ring={theme.monogramRing}
          className="size-28 text-accent sm:size-36"
          title="Monogram"
        />
      </ThemedHero>

      {/* 2 · COUNTDOWN */}
      {invite.settings.showCountdown !== false && (
        <Section id="countdown" divider={theme.motifSet.divider} overline="The celebration begins in">
          <motion.div variants={fadeUpStagger}>
            <CountdownTimer target={invite.mainDate} />
          </motion.div>
        </Section>
      )}

      {/* 3 · OUR STORY */}
      {invite.story && (
        <Section id="story" divider={theme.motifSet.accent} overline="Two families, one story" title="Our Story">
          <OurStorySection
            theme={theme}
            story={invite.story}
            moments={invite.storyMoments}
            photos={[invite.photos[0]?.url, invite.photos[1]?.url].filter(Boolean) as string[]}
          />
        </Section>
      )}

      {/* 3b · THE FILM */}
      <Section id="film" divider={theme.motifSet.divider} overline="Press play" title="Our Film">
        <motion.div variants={fadeUpStagger}>
          <VideoHero posterSeed={`${invite.slug}-film`} title="Watch our story" subtitle="three minutes, one monsoon" />
        </motion.div>
      </Section>

      {/* 4 · EVENTS */}
      {invite.events.length > 0 && (
        <Section id="events" divider={theme.motifSet.divider} overline="Join us for" title="The Celebrations">
          <motion.div variants={fadeUpStagger} className="mx-auto mb-8 max-w-md">
            <EventCalendar events={invite.events} />
          </motion.div>
          <div className="flex flex-col gap-5">
            {invite.events.map((ev, i) => (
              <motion.div key={ev.id} variants={fadeUpStagger} custom={i}>
                <EventTimelineItem event={ev} />
              </motion.div>
            ))}
          </div>
        </Section>
      )}

      {/* 5 · FAMILY — the full tree is demo-only; real events show host households. */}
      {invite.isDemo && first && second ? (
        <Section id="family" divider={theme.motifSet.accent} overline="With the blessings of" title="Our Families">
          <motion.div variants={fadeUpStagger}>
            <FamilyTree
              groomSide={{ ...groomFamily, household: first.family ?? "", partner: { ...groomFamily.partner, name: first.name } }}
              brideSide={{ ...brideFamily, household: second.family ?? "", partner: { ...brideFamily.partner, name: second.name } }}
              order="groom-first"
            />
          </motion.div>
        </Section>
      ) : (
        invite.hosts.some((h) => h.family) && (
          <Section id="family" divider={theme.motifSet.accent} overline="With the blessings of" title="Our Families">
            <div className="grid gap-5 sm:grid-cols-2">
              {invite.hosts.filter((h) => h.family).map((h) => (
                <motion.div key={h.name} variants={fadeUpStagger}>
                  <ThemedCard theme={theme} className="!p-6 text-center">
                    <p className="type-verse text-primary">{h.family}</p>
                    <p className="mt-1 type-overline">{h.name}</p>
                  </ThemedCard>
                </motion.div>
              ))}
            </div>
          </Section>
        )
      )}

      {/* 6 · GALLERY */}
      {invite.photos.length > 0 && (
        <Section id="gallery" divider={theme.motifSet.divider} overline="Moments" title="Gallery">
          <div className="columns-2 gap-4 sm:columns-3 [&>*]:mb-4">
            {invite.photos.slice(0, 12).map((photo, i) => (
              <motion.button
                key={photo.id}
                variants={fadeUpStagger}
                custom={i}
                onClick={() => setLightbox(photo.url)}
                className="block w-full cursor-pointer break-inside-avoid"
                aria-label={`View photo ${i + 1} full size`}
              >
                <PhotoFrame
                  src={photo.url}
                  caption={photo.caption}
                  variant={theme.frameStyle}
                  width={300}
                  height={i % 2 ? 380 : 300}
                  className="w-full [&_img]:w-full"
                />
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
              <img src={lightbox} alt="Photograph, enlarged" className="max-h-full max-w-full rounded-card shadow-lifted" />
            </button>
          )}
        </Section>
      )}

      {/* 7 · RSVP */}
      {rsvpEnabled && (
        <Section id="rsvp" divider={theme.motifSet.accent} overline="Kindly respond" title="RSVP">
          <motion.div variants={fadeUpStagger}>
            <RSVPForm
              events={invite.events}
              mealOptions={theme.mealOptions}
              guestName={guestName ?? ""}
              onSubmit={(submission) =>
                submitRsvp({
                  slug: invite.slug,
                  guestName: submission.guestName,
                  attending: submission.attending,
                  headcount: submission.headcount,
                  subEventKeys: submission.events,
                  meal: submission.meal,
                  message: submission.message,
                  guestToken,
                })
              }
            />
          </motion.div>
        </Section>
      )}

      {/* 8 · BLESSINGS */}
      {blessingsEnabled && (
        <Section id="blessings" divider={theme.motifSet.divider} overline="From loved ones" title="Blessings Wall">
          <motion.div variants={fadeUpStagger}>
            <BlessingsWall
              seed={blessings}
              onSubmit={(blessing) => submitBlessing({ slug: invite.slug, ...blessing })}
            />
          </motion.div>
        </Section>
      )}

      {/* 9 · TRAVEL & VENUE */}
      {invite.events.length > 0 && (
        <Section id="travel" divider={theme.motifSet.accent} overline="Getting there" title="Travel & Venue">
          <div className="grid gap-5 sm:grid-cols-2">
            {[...new Map(invite.events.filter((e) => e.venue).map((e) => [e.venue, e])).values()]
              .slice(0, 2)
              .map((ev, i) => (
                <motion.div key={ev.venue} variants={fadeUpStagger} custom={i}>
                  <MapEmbedPlaceholder venue={ev.venue} address={ev.address} />
                </motion.div>
              ))}
          </div>
          {invite.hotels.length > 0 && (
            <motion.div variants={fadeUpStagger} className="mt-8">
              <h3 className="mb-4 text-center type-h2 text-primary">Where to stay</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {invite.hotels.map((h) => (
                  <ThemedCard key={h.name} theme={theme} className="!p-5 text-center">
                    <p className="font-semibold text-primary">{h.name}</p>
                    <p className="type-caption">{h.distance}</p>
                    <p className="type-caption">{h.phone}</p>
                  </ThemedCard>
                ))}
              </div>
            </motion.div>
          )}
          {invite.events.some((e) => e.dressCode) && (
            <motion.div variants={fadeUpStagger} className="mt-8 text-center">
              <p className="type-overline mb-3">Dress codes</p>
              <div className="flex flex-wrap justify-center gap-2">
                {invite.events.filter((e) => e.dressCode).map((e) => (
                  <span key={e.id} className="rounded-pill border border-ornate/60 px-4 py-1.5 text-sm">
                    <strong>{e.name}:</strong> {e.dressCode}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </Section>
      )}

      {/* FOOTER */}
      <footer className="mx-auto mt-24 w-full max-w-4xl px-4 text-center">
        <Divider variant="motif" motif={theme.motifSet.divider} className="mb-10" />
        {invite.hashtag && <p className="type-h2 text-primary">{invite.hashtag}</p>}
        <GiftBlock className="mx-auto mt-8 max-w-md" />
        <div className="mt-8 flex justify-center gap-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`You're invited! ${names} — `)}`}
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
