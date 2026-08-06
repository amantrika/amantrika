"use client";

/**
 * localStorage-backed demo store. Keys map 1:1 to future API resources:
 *   amantrika:draft        → onboarding draft (POST /invites/draft)
 *   amantrika:live-invite  → published invite (POST /invites)
 *   amantrika:rsvps        → guest RSVPs      (POST /invites/:slug/rsvps)
 *   amantrika:blessings    → blessing wall    (POST /invites/:slug/blessings)
 * Keep these shapes stable when a real backend arrives.
 */
import type { CoupleData } from "@/data/couples";
import type { Blessing } from "@/data/blessings";

export const KEYS = {
  draft: "amantrika:draft",
  live: "amantrika:live-invite",
  rsvps: "amantrika:rsvps",
  blessings: "amantrika:blessings",
} as const;

export interface RsvpEntry {
  id: string;
  guestName: string;
  attending: "yes" | "no" | "maybe";
  headcount: number;
  events: string[];
  meal: string;
  message?: string;
  at: string; // ISO timestamp
}

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const store = {
  getDraft: () => read<Partial<CoupleData>>(KEYS.draft),
  saveDraft: (draft: Partial<CoupleData>) => write(KEYS.draft, draft),
  getLiveInvite: () => read<CoupleData>(KEYS.live),
  publishInvite: (invite: CoupleData) => write(KEYS.live, invite),
  updateLiveInvite: (patch: Partial<CoupleData>) => {
    const cur = read<CoupleData>(KEYS.live);
    if (cur) write(KEYS.live, { ...cur, ...patch });
  },
  getRsvps: () => read<RsvpEntry[]>(KEYS.rsvps) ?? [],
  addRsvp: (entry: RsvpEntry) => write(KEYS.rsvps, [entry, ...(read<RsvpEntry[]>(KEYS.rsvps) ?? [])]),
  getBlessings: () => read<Blessing[]>(KEYS.blessings) ?? [],
  addBlessing: (b: Blessing) => write(KEYS.blessings, [b, ...(read<Blessing[]>(KEYS.blessings) ?? [])]),
  resetAll: () => Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k)),
};
