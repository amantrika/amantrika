import "server-only";
import { createPublicClient } from "@/lib/supabase/server";
import type { FeatureRequest, LeaderboardRow } from "./types";

/**
 * The board, ranked by votes. Public — no session required, and session-less by
 * necessity: both of these run inside `getCachedFeatureBoard`'s
 * `unstable_cache`, where reading `cookies()` is a hard error in Next 15.
 */
export async function listFeatureRequests(): Promise<FeatureRequest[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("feature_requests")
    .select("id, title, body, status, status_note, vote_count, created_at, profiles(full_name)")
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    status: r.status,
    statusNote: r.status_note,
    votes: r.vote_count,
    // Only a display name is ever exposed — never the proposer's email.
    authorName:
      (r.profiles as { full_name: string | null } | null)?.full_name?.trim() || null,
    createdAt: r.created_at,
  }));
}

export async function featureLeaderboard(): Promise<LeaderboardRow[]> {
  const supabase = createPublicClient();
  const { data } = await supabase.rpc("feature_leaderboard", { p_limit: 20 });
  return ((data ?? []) as {
    profile_id: string;
    name: string;
    requests: number;
    votes_received: number;
    votes_cast: number;
  }[]).map((r) => ({
    profileId: r.profile_id,
    name: r.name,
    requests: Number(r.requests),
    votesReceived: Number(r.votes_received),
    votesCast: Number(r.votes_cast),
  }));
}
