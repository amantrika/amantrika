import type { Database } from "@/lib/supabase/types";

export type FeatureStatus = Database["public"]["Enums"]["feature_status"];

export interface FeatureRequest {
  id: string;
  title: string;
  body: string | null;
  status: FeatureStatus;
  statusNote: string | null;
  votes: number;
  authorName: string | null;
  createdAt: string;
}

export interface LeaderboardRow {
  profileId: string;
  name: string;
  requests: number;
  votesReceived: number;
  votesCast: number;
}

/** Copy and tone for each status, kept in one place so the board reads consistently. */
export const STATUS_META: Record<
  FeatureStatus,
  { label: string; tone: "neutral" | "success" | "accent" | "primary" | "error"; blurb: string }
> = {
  open: { label: "Open", tone: "neutral", blurb: "Collecting votes" },
  planned: { label: "Planned", tone: "accent", blurb: "We're going to build this" },
  building: { label: "Building", tone: "primary", blurb: "In progress now" },
  shipped: { label: "Shipped", tone: "success", blurb: "Live today" },
  declined: { label: "Not planned", tone: "error", blurb: "We've decided against it, for now" },
};

/** Voting is only open before a decision has been made. */
export function isVotable(status: FeatureStatus): boolean {
  return status === "open";
}
