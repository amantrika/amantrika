import { couples, type CoupleData } from "@/data/couples";
import type { InviteView } from "@/lib/invites/invite";

/**
 * The three bundled showcase invites. They are not database rows — they exist so
 * marketing links and the design-system docs keep working against an empty
 * database, and so a visitor can see a finished invite before signing up.
 */
export function isDemoSlug(slug: string): boolean {
  return couples.some((c) => c.slug === slug);
}

export function demoInvite(slug: string): InviteView | null {
  const couple = couples.find((c) => c.slug === slug);
  return couple ? fromMock(couple) : null;
}

export function demoInvites(): InviteView[] {
  return couples.map(fromMock);
}

function fromMock(c: CoupleData): InviteView {
  return {
    id: null,
    slug: c.slug,
    eventType: "wedding",
    themeId: c.themeId,
    title: `${c.partner1.name} & ${c.partner2.name}`,
    hosts: [
      { name: c.partner1.name, family: c.partner1.family, role: "partner" },
      { name: c.partner2.name, family: c.partner2.family, role: "partner" },
    ],
    hashtag: c.hashtag,
    mainDate: c.mainDate,
    city: c.city,
    story: c.story,
    storyMoments: c.storyMoments,
    photos: c.photos.map((seed, i) => ({
      id: seed,
      url: `https://picsum.photos/seed/${seed}/${i % 2 ? 600 : 640}/${i % 2 ? 760 : 600}`,
    })),
    events: c.events.map((e) => ({
      id: e.id,
      name: e.name,
      date: e.date,
      time: e.time,
      venue: e.venue,
      address: e.address,
      dressCode: e.dressCode,
    })),
    hotels: c.hotels,
    settings: { rsvpEnabled: true, blessingsEnabled: true, showCountdown: true },
    // Marketing surfaces, not customer work: they advertise the product, so
    // watermarking them would be self-defeating.
    planCode: "premium",
    isDemo: true,
  };
}
