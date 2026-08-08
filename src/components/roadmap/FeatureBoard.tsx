"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronUp, Lightbulb, Trophy } from "lucide-react";
import { Badge, Button, Card, Input, Textarea } from "@/design-system/components";
import { proposeFeature, voteForFeature } from "@/lib/features/actions";
import { STATUS_META, isVotable, type FeatureRequest, type LeaderboardRow } from "@/lib/features/types";

type View = "features" | "members";

/**
 * The community half of the roadmap: what people have asked for, how much they
 * want it, and who is contributing.
 *
 * Two different bars, on purpose. Voting is anonymous and one-per-person so the
 * signal is cheap to give; proposing needs an account, because an open submit
 * box on a public page is a spam target and a proposal is something we may need
 * to reply to.
 */
export function FeatureBoard({
  requests,
  leaderboard,
  votedIds,
  signedIn,
}: {
  requests: FeatureRequest[];
  leaderboard: LeaderboardRow[];
  votedIds: string[];
  signedIn: boolean;
}) {
  const [view, setView] = useState<View>("features");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Roadmap view"
        className="mb-6 inline-flex rounded-pill border border-ornate/60 bg-surface p-1"
      >
        <ViewTab active={view === "features"} onClick={() => setView("features")} icon={Lightbulb}>
          Requests
        </ViewTab>
        <ViewTab active={view === "members"} onClick={() => setView("members")} icon={Trophy}>
          Community
        </ViewTab>
      </div>

      {view === "features" ? (
        <FeaturesView requests={requests} votedIds={votedIds} signedIn={signedIn} />
      ) : (
        <MembersView rows={leaderboard} />
      )}
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Lightbulb;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-pill px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
        active ? "bg-primary text-bg shadow-resting" : "text-muted hover:text-foreground"
      }`}
    >
      <Icon aria-hidden className="size-4" />
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- requests */

function FeaturesView({
  requests,
  votedIds,
  signedIn,
}: {
  requests: FeatureRequest[];
  votedIds: string[];
  signedIn: boolean;
}) {
  const [voted, setVoted] = useState<Set<string>>(new Set(votedIds));
  const [message, setMessage] = useState<string | null>(null);

  // Backlog is everything still open; decided items are grouped under their
  // outcome so the page reads as a plan rather than an undifferentiated list.
  const open = requests.filter((r) => r.status === "open");
  const decided = requests.filter((r) => r.status !== "open");

  return (
    <div className="flex flex-col gap-10">
      <ProposeForm signedIn={signedIn} onMessage={setMessage} />

      {message && (
        <p role="status" className="rounded-md border border-ornate bg-accent/10 px-3 py-2 type-caption">
          {message}
        </p>
      )}

      <section>
        <h3 className="type-h2 text-primary">Backlog · {open.length}</h3>
        <p className="mt-1 type-caption">
          Open for votes. What rises here is what we look at next.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {open.length === 0 && (
            <Card className="p-8 text-center">
              <p className="type-caption italic">Nothing proposed yet. Be the first.</p>
            </Card>
          )}
          {open.map((r) => (
            <RequestRow
              key={r.id}
              request={r}
              hasVoted={voted.has(r.id)}
              onVoted={() => setVoted((s) => new Set(s).add(r.id))}
              onError={setMessage}
            />
          ))}
        </ul>
      </section>

      {decided.length > 0 && (
        <section>
          <h3 className="type-h2 text-primary">Decided</h3>
          <p className="mt-1 type-caption">
            Voting closes once we&apos;ve made a call, so the outcome stays visible.
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {decided.map((r) => (
              <RequestRow key={r.id} request={r} hasVoted={voted.has(r.id)} onVoted={() => {}} onError={setMessage} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function RequestRow({
  request,
  hasVoted,
  onVoted,
  onError,
}: {
  request: FeatureRequest;
  hasVoted: boolean;
  onVoted: () => void;
  onError: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  // Optimistic so the count moves the instant it is tapped; the server is the
  // authority and a rejection puts it back.
  const [votes, addVote] = useOptimistic(request.votes, (n: number) => n + 1);
  const meta = STATUS_META[request.status];
  const votable = isVotable(request.status);

  function vote() {
    if (hasVoted || !votable) return;
    startTransition(async () => {
      addVote(null);
      const result = await voteForFeature(request.id);
      if (result.ok) onVoted();
      else onError(result.error ?? "Couldn't record that vote.");
    });
  }

  return (
    <li>
      <Card className="flex items-start gap-4 p-5">
        <button
          onClick={vote}
          disabled={hasVoted || !votable || pending}
          aria-label={
            votable ? (hasVoted ? `You voted for ${request.title}` : `Vote for ${request.title}`) : "Voting closed"
          }
          aria-pressed={hasVoted}
          className={`flex w-14 shrink-0 flex-col items-center rounded-card border py-2 transition-colors ${
            !votable
              ? "cursor-default border-ornate/30 text-muted"
              : hasVoted
                ? "cursor-default border-primary bg-primary/10 text-primary"
                : "cursor-pointer border-ornate/50 text-muted hover:border-ornate hover:text-primary"
          }`}
        >
          <ChevronUp aria-hidden className="size-4" />
          <span className="font-display text-lg font-semibold">{votes}</span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="type-h2 text-primary">{request.title}</h4>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>

          {request.body && <p className="mt-2 type-body text-muted">{request.body}</p>}

          {request.statusNote && (
            <p className="mt-2 rounded-soft border-l-2 border-ornate/60 bg-raised px-3 py-2 type-caption">
              {request.statusNote}
            </p>
          )}

          <p className="mt-2 type-caption">
            {request.authorName ? `Suggested by ${request.authorName}` : "Suggested by a member"}
            {" · "}
            {new Date(request.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            {!votable && ` · ${meta.blurb}`}
          </p>
        </div>
      </Card>
    </li>
  );
}

/* ----------------------------------------------------------------- propose */

function ProposeForm({
  signedIn,
  onMessage,
}: {
  signedIn: boolean;
  onMessage: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <Card variant="ornate" className="flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="type-body text-muted">
          Voting is open to everyone. To <strong>suggest</strong> something, sign in — it keeps the
          board free of spam and lets us reply to you.
        </p>
        <Link href="/login?next=/roadmap">
          <Button size="sm">Sign in to suggest</Button>
        </Link>
      </Card>
    );
  }

  if (!open) {
    return (
      <Button variant="celebration" className="self-start" onClick={() => setOpen(true)}>
        <Lightbulb className="size-4" /> Suggest a feature
      </Button>
    );
  }

  return (
    <Card variant="ornate" className="p-6">
      <h3 className="type-h2 text-primary">Suggest a feature</h3>
      <div className="mt-4 flex flex-col gap-4">
        <Input
          label="What should we build?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Seating chart for the reception"
          maxLength={120}
        />
        <Textarea
          label="Why it matters (optional)"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          hint="What you're trying to do, and what you do today instead."
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            loading={pending}
            loadingLabel="Posting your idea"
            onClick={() =>
              startTransition(async () => {
                const result = await proposeFeature({ title, body: body || undefined });
                onMessage(result.ok ? (result.notice ?? "Posted.") : (result.error ?? "Failed."));
                if (result.ok) {
                  setTitle("");
                  setBody("");
                  setOpen(false);
                }
              })
            }
          >
            Post idea
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------- community */

function MembersView({ rows }: { rows: LeaderboardRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="type-body text-muted">
          Nobody has suggested or voted yet. The first person here gets the top spot.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <p className="mb-4 type-caption">
        Ranked by votes their ideas received, not by how many they posted — twenty ideas nobody
        wants shouldn&apos;t outrank one good one.
      </p>
      <ul className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <li key={row.profileId}>
            <Card className="flex items-center gap-4 p-4">
              <span className="w-8 shrink-0 text-center font-display text-2xl font-semibold text-accent">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="type-body font-semibold text-foreground">{row.name}</p>
                <p className="type-caption">
                  {row.requests} idea{row.requests === 1 ? "" : "s"} · {row.votesCast} vote
                  {row.votesCast === 1 ? "" : "s"} cast
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-semibold text-primary">{row.votesReceived}</p>
                <p className="type-caption">votes received</p>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
