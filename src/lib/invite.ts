import { env } from "@/lib/env";
import type {
  AssetRow,
  EventHost,
  EventRow,
  EventSettings,
  EventType,
  Hotel,
  StoryMoment,
  SubEventRow,
} from "@/lib/supabase/types";

/**
 * View model the invite page renders. Deliberately decoupled from the table rows
 * so mock demo data and real database records can both feed the same components.
 */
export interface InviteView {
  id: string | null;
  slug: string;
  eventType: EventType;
  themeId: string;
  title: string;
  hosts: EventHost[];
  hashtag: string;
  mainDate: string;
  city: string;
  story: string;
  storyMoments: StoryMoment[];
  photos: InvitePhoto[];
  events: InviteSubEvent[];
  hotels: Hotel[];
  settings: EventSettings;
  /** True for the built-in showcase invites that aren't backed by a row. */
  isDemo: boolean;
}

export interface InvitePhoto {
  id: string;
  /** Fully-qualified URL. Demo invites point at picsum, real ones at Storage. */
  url: string;
  caption?: string;
}

/** Mirrors the legacy WeddingEvent shape the timeline components already consume. */
export interface InviteSubEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  dressCode?: string;
  mapUrl?: string;
}

export const ASSET_BUCKET = "event-assets";

/** Public CDN URL for a stored object. The bucket is public-read by design. */
export function assetUrl(storagePath: string): string {
  return `${env.supabaseUrl}/storage/v1/object/public/${ASSET_BUCKET}/${storagePath}`;
}

const defaultSettings: Required<Pick<EventSettings, "rsvpEnabled" | "blessingsEnabled" | "showCountdown">> = {
  rsvpEnabled: true,
  blessingsEnabled: true,
  showCountdown: true,
};

export function toInviteView(
  event: EventRow,
  subEvents: SubEventRow[],
  assets: AssetRow[]
): InviteView {
  return {
    id: event.id,
    slug: event.slug,
    eventType: event.event_type,
    themeId: event.theme_id,
    title: event.title,
    hosts: Array.isArray(event.hosts) ? event.hosts : [],
    hashtag: event.hashtag ?? "",
    // Countdown and date formatting both need a parseable date; fall back to now.
    mainDate: event.main_datetime ?? new Date().toISOString(),
    city: event.city ?? "",
    story: event.story ?? "",
    storyMoments: Array.isArray(event.story_moments) ? event.story_moments : [],
    photos: assets
      .filter((a) => a.kind === "photo")
      .map((a) => ({ id: a.id, url: assetUrl(a.storage_path), caption: a.caption ?? undefined })),
    events: subEvents.map(toInviteSubEvent),
    hotels: Array.isArray(event.hotels) ? event.hotels : [],
    settings: { ...defaultSettings, ...event.settings },
    isDemo: false,
  };
}

function toInviteSubEvent(s: SubEventRow): InviteSubEvent {
  return {
    id: s.key,
    name: s.name,
    date: s.starts_at ? s.starts_at.slice(0, 10) : "",
    time: s.time_label ?? formatTime(s.starts_at),
    venue: s.venue ?? "",
    address: s.address ?? "",
    dressCode: s.dress_code ?? undefined,
    mapUrl: s.map_url ?? undefined,
  };
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Two-letter monogram, resilient to one-host events like a birthday. */
export function monogramInitials(hosts: EventHost[]): [string, string] {
  const a = hosts[0]?.name?.[0]?.toUpperCase() ?? "A";
  const b = hosts[1]?.name?.[0]?.toUpperCase() ?? a;
  return [a, b];
}

/** "Swarnil & Prachi", "Aarav", "Acme, Globex & Initech". */
export function hostLine(hosts: EventHost[]): string {
  const names = hosts.map((h) => h.name).filter(Boolean);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

export const eventTypeLabels: Record<EventType, string> = {
  wedding: "Wedding",
  engagement: "Engagement",
  reception: "Reception",
  anniversary: "Anniversary",
  birthday: "Birthday",
  baby_shower: "Baby shower",
  naming: "Naming ceremony",
  housewarming: "Housewarming",
  graduation: "Graduation",
  corporate: "Corporate event",
  other: "Celebration",
};

/** Ceremony presets offered in onboarding, per event type. */
export const subEventPresets: Partial<Record<EventType, { key: string; name: string }[]>> = {
  wedding: [
    { key: "haldi", name: "Haldi" },
    { key: "mehndi", name: "Mehndi" },
    { key: "sangeet", name: "Sangeet" },
    { key: "baraat", name: "Baraat" },
    { key: "ceremony", name: "Ceremony" },
    { key: "reception", name: "Reception" },
  ],
  engagement: [
    { key: "roka", name: "Roka" },
    { key: "ring", name: "Ring ceremony" },
    { key: "dinner", name: "Celebration dinner" },
  ],
  birthday: [
    { key: "cake", name: "Cake cutting" },
    { key: "party", name: "Party" },
  ],
  baby_shower: [
    { key: "godh", name: "Godh Bharai" },
    { key: "lunch", name: "Lunch" },
  ],
  housewarming: [
    { key: "puja", name: "Griha Pravesh Puja" },
    { key: "lunch", name: "Lunch" },
  ],
  corporate: [
    { key: "keynote", name: "Keynote" },
    { key: "sessions", name: "Sessions" },
    { key: "networking", name: "Networking" },
  ],
};
