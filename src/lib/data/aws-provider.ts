import "server-only";
import type { DataProvider } from "@/lib/data/provider";
import { getPublishedInviteBySlug } from "@/lib/aws/repo/invites";
import { assetUrl, defaultSettings, formatTime, type InviteView } from "@/lib/invites/invite";
import type {
  EventHost,
  EventSettings,
  EventType,
  Hotel,
  StoryMoment,
} from "@/lib/supabase/types";

/**
 * DynamoDB-backed reads.
 *
 * The only job here is translation: the repository returns items shaped like
 * the table, the app expects `InviteView`. Keeping that mapping in this file —
 * rather than making the repository return view models — is what lets the two
 * providers stay swappable without either knowing the other exists.
 *
 * **Known gap while the migration is in flight:** `assetUrl()` still builds a
 * Supabase Storage URL, so with `DATA_PROVIDER=aws` the invitation *data* comes
 * from DynamoDB while its *photographs* still come from Supabase. That is
 * deliberate and temporary — media moves in its own phase — but it means "AWS
 * mode" is not yet Supabase-free, and nobody should read a green test here as
 * proof that it is.
 */
export class AwsDataProvider implements DataProvider {
  readonly name = "aws" as const;

  async getPublishedInvite(slug: string): Promise<InviteView | null> {
    const found = await getPublishedInviteBySlug(slug);
    if (!found) return null;

    const { invite, subEvents, assets } = found;

    return {
      id: invite.id,
      slug: invite.slug,
      eventType: invite.eventType as EventType,
      themeId: invite.themeId,
      title: invite.title,
      hosts: (Array.isArray(invite.hosts) ? invite.hosts : []) as EventHost[],
      hashtag: invite.hashtag ?? "",
      // Postgres allowed a null date and the old mapper fell back to now.
      // Keep that: a half-built draft should render, not crash the page.
      mainDate: invite.mainDateTime ?? new Date().toISOString(),
      city: invite.city ?? "",
      story: invite.story ?? "",
      storyMoments: (Array.isArray(invite.storyMoments)
        ? invite.storyMoments
        : []) as StoryMoment[],
      photos: assets
        .filter((a) => a.kind === "photo")
        .map((a) => ({ id: a.id, url: assetUrl(a.storagePath), caption: a.caption })),
      // Mirrors toInviteSubEvent() in invite.ts field for field: the view's
      // `id` is the sub-event *key*, the date is the day alone, and the time is
      // the host's own label when they gave one. The components key on all
      // three, so a near-miss here renders a plausible, wrong page.
      events: subEvents
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => ({
          id: s.key,
          name: s.name,
          date: s.startsAt ? s.startsAt.slice(0, 10) : "",
          time: s.timeLabel ?? formatTime(s.startsAt ?? null),
          venue: s.venue ?? "",
          address: s.address ?? "",
          dressCode: s.dressCode,
          mapUrl: s.mapUrl,
        })),
      hotels: (Array.isArray(invite.hotels) ? invite.hotels : []) as Hotel[],
      settings: { ...defaultSettings, ...(invite.settings as EventSettings) },
      planCode: invite.planCode,
      isDemo: false,
    };
  }

}
