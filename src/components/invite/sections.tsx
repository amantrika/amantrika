"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  BlessingsWall, CountdownTimer, EventCalendar, EventTimelineItem, FamilyTree,
  GiftBlock, MapEmbedPlaceholder, OurStorySection, PhotoFrame, RSVPForm,
  ThemedCard, VideoHero,
} from "@/design-system/components";
import { fadeUpStagger } from "@/design-system/motion/presets";
import { brideFamily, groomFamily } from "@/data/families";
import type { Blessing } from "@/data/blessings";
import { hostLine, type InviteView } from "@/lib/invite";
import type { SectionId, Theme } from "@/themes";

/**
 * THE SECTION REGISTRY
 *
 * One entry per `SectionId`. The theme's `layout.order` decides which of these
 * appear and in what sequence; each entry decides only whether it has anything
 * to say. A section that returns `null` is skipped entirely — no empty heading,
 * no empty divider — which is what lets a theme list `story` even for an
 * invitation whose host never wrote one.
 *
 * Nothing in here reads `theme.id`. If a section needs to look different per
 * theme, that difference belongs in the theme's `SectionStyle`.
 */

export interface SectionContext {
  invite: InviteView;
  theme: Theme;
  blessings: Blessing[];
  guestName?: string;
  guestToken?: string;
  /** Alignment inherited from the section's resolved style. */
  align: "center" | "left";
  onOpenPhoto: (url: string) => void;
  onRsvp: React.ComponentProps<typeof RSVPForm>["onSubmit"];
  onBlessing: React.ComponentProps<typeof BlessingsWall>["onSubmit"];
}

export interface RenderedSection {
  overline?: string;
  title?: string;
  body: ReactNode;
}

type Renderer = (ctx: SectionContext) => RenderedSection | null;

const renderers: Record<SectionId, Renderer> = {
  /* ---------- verse — the formal invitation wording ---------- */
  verse: ({ invite }) => {
    const names = hostLine(invite.hosts);
    if (!names) return null;
    return {
      body: (
        <motion.div variants={fadeUpStagger} className="text-center">
          <p className="type-overline">Together with their families</p>
          <p className="mt-4 type-verse text-primary" style={{ fontSize: "var(--text-h2)" }}>
            {names}
          </p>
          <p className="mt-4 type-body-lg text-muted">
            request the pleasure of your company at the celebration of their {invite.eventType}
            {invite.city ? ` in ${invite.city}` : ""}.
          </p>
        </motion.div>
      ),
    };
  },

  /* ---------- countdown ---------- */
  countdown: ({ invite }) => {
    if (invite.settings.showCountdown === false) return null;
    return {
      overline: "The celebration begins in",
      title: "Counting down",
      body: (
        <motion.div variants={fadeUpStagger} className="px-4">
          <CountdownTimer target={invite.mainDate} />
        </motion.div>
      ),
    };
  },

  /* ---------- story ---------- */
  story: ({ invite, theme }) => {
    if (!invite.story) return null;
    return {
      overline: "Two families, one story",
      title: "Our Story",
      body: (
        <OurStorySection
          theme={theme}
          story={invite.story}
          moments={invite.storyMoments}
          photos={[invite.photos[0]?.url, invite.photos[1]?.url].filter(Boolean) as string[]}
        />
      ),
    };
  },

  /* ---------- film — showcase invites only ----------
     Real invitations have no video field yet, and a placeholder film on a
     stranger's wedding page would be worse than no section at all. */
  film: ({ invite }) => {
    if (!invite.isDemo) return null;
    return {
      overline: "Press play",
      title: "Our Film",
      body: (
        <motion.div variants={fadeUpStagger}>
          <VideoHero
            posterSeed={`${invite.slug}-film`}
            title="Watch our story"
            subtitle="three minutes, one monsoon"
          />
        </motion.div>
      ),
    };
  },

  /* ---------- events ---------- */
  events: ({ invite }) => {
    if (!invite.events.length) return null;
    return {
      overline: "Join us for",
      title: "The Celebrations",
      body: (
        <>
          <motion.div variants={fadeUpStagger} className="mx-auto mb-8 max-w-md px-4">
            <EventCalendar events={invite.events} />
          </motion.div>
          <div className="block-stack px-4">
            {invite.events.map((ev, i) => (
              <motion.div key={ev.id} variants={fadeUpStagger} custom={i}>
                <EventTimelineItem event={ev} />
              </motion.div>
            ))}
          </div>
        </>
      ),
    };
  },

  /* ---------- family ---------- */
  family: ({ invite, theme }) => {
    const [first, second] = invite.hosts;

    // The full tree is showcase-only: real invitations don't collect grandparents.
    if (invite.isDemo && first && second) {
      return {
        overline: "With the blessings of",
        title: "Our Families",
        body: (
          <motion.div variants={fadeUpStagger} className="px-4">
            <FamilyTree
              groomSide={{ ...groomFamily, household: first.family ?? "", partner: { ...groomFamily.partner, name: first.name } }}
              brideSide={{ ...brideFamily, household: second.family ?? "", partner: { ...brideFamily.partner, name: second.name } }}
              order="groom-first"
            />
          </motion.div>
        ),
      };
    }

    const households = invite.hosts.filter((h) => h.family);
    if (!households.length) return null;

    return {
      overline: "With the blessings of",
      title: "Our Families",
      body: (
        <div className="grid gap-5 px-4 sm:grid-cols-2">
          {households.map((h) => (
            <motion.div key={h.name} variants={fadeUpStagger}>
              <ThemedCard theme={theme} className="!p-6 text-center">
                <p className="type-verse text-primary">{h.family}</p>
                <p className="mt-1 type-overline">{h.name}</p>
              </ThemedCard>
            </motion.div>
          ))}
        </div>
      ),
    };
  },

  /* ---------- gallery ---------- */
  gallery: ({ invite, theme, onOpenPhoto }) => {
    if (!invite.photos.length) return null;
    return {
      overline: "Moments",
      title: "Gallery",
      body: (
        <div className="columns-2 gap-4 px-4 sm:columns-3 [&>*]:mb-4">
          {invite.photos.slice(0, 12).map((photo, i) => (
            <motion.button
              key={photo.id}
              variants={fadeUpStagger}
              custom={i}
              onClick={() => onOpenPhoto(photo.url)}
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
      ),
    };
  },

  /* ---------- rsvp ---------- */
  rsvp: ({ invite, theme, guestName, onRsvp }) => {
    if (invite.settings.rsvpEnabled === false) return null;
    return {
      overline: "Kindly respond",
      title: "RSVP",
      body: (
        <motion.div variants={fadeUpStagger} className="px-4">
          <RSVPForm
            events={invite.events}
            mealOptions={theme.mealOptions}
            guestName={guestName ?? ""}
            onSubmit={onRsvp}
          />
        </motion.div>
      ),
    };
  },

  /* ---------- blessings ---------- */
  blessings: ({ invite, blessings, onBlessing }) => {
    if (invite.settings.blessingsEnabled === false) return null;
    return {
      overline: "From loved ones",
      title: "Blessings Wall",
      body: (
        <motion.div variants={fadeUpStagger} className="px-4">
          <BlessingsWall seed={blessings} onSubmit={onBlessing} />
        </motion.div>
      ),
    };
  },

  /* ---------- travel ---------- */
  travel: ({ invite, theme }) => {
    if (!invite.events.length) return null;

    const venues = [
      ...new Map(invite.events.filter((e) => e.venue).map((e) => [e.venue, e])).values(),
    ].slice(0, 2);
    const dressCoded = invite.events.filter((e) => e.dressCode);

    if (!venues.length && !invite.hotels.length && !dressCoded.length) return null;

    return {
      overline: "Getting there",
      title: "Travel & Venue",
      body: (
        <div className="px-4">
          {venues.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              {venues.map((ev, i) => (
                <motion.div key={ev.venue} variants={fadeUpStagger} custom={i}>
                  <MapEmbedPlaceholder venue={ev.venue} address={ev.address} />
                </motion.div>
              ))}
            </div>
          )}

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

          {dressCoded.length > 0 && (
            <motion.div variants={fadeUpStagger} className="mt-8 text-center">
              <p className="type-overline mb-3">Dress codes</p>
              <div className="flex flex-wrap justify-center gap-2">
                {dressCoded.map((e) => (
                  <span key={e.id} className="rounded-pill border border-ornate/60 px-4 py-1.5 text-sm">
                    <strong>{e.name}:</strong> {e.dressCode}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      ),
    };
  },

  /* ---------- gift ---------- */
  gift: () => ({
    overline: "If you wish",
    title: "Blessings & Gifts",
    body: (
      <motion.div variants={fadeUpStagger} className="px-4">
        <GiftBlock className="mx-auto max-w-md" />
      </motion.div>
    ),
  }),
};

export function renderSection(id: SectionId, ctx: SectionContext): RenderedSection | null {
  return renderers[id](ctx);
}
