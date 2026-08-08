import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
import { claimAndSend, type RenderedEmail } from "@/lib/notifications/ledger";
import { emailLayout } from "@/lib/notifications/layout";
import type { CronJobResult } from "@/lib/notifications/types";

/**
 * The abandoned-draft nudge sequence (spec §15).
 *
 * Ported from `n8n/workflows/05-host-abandoned-draft-nudge.json`. The candidate
 * query — which bucket a draft falls into, and the guards that stop a sequence
 * restarting — lives in `public.cron_stale_draft_nudges()` so the rules stay in
 * one place and are readable as SQL.
 *
 * The 72-hour message is the one that converts: a host who is 70%+ done and has
 * gone quiet is deciding, not forgetting.
 */

const WORKFLOW = "05-host-abandoned-draft-nudge";

type Candidate = {
  event_id: string;
  slug: string;
  title: string;
  owner_email: string;
  owner_name: string;
  kind: string;
  completion_score: number;
  next_step: string;
  hours_idle: number;
  event_date: string | null;
  days_until_event: number | null;
  dedupe_key: string;
};

/**
 * Copy per bucket. Each leads with the claim, not the wind-up, and each names
 * the single next thing to do — a nudge that says "come back" is worth less than
 * one that says "you're missing the date".
 */
function render(candidate: Candidate): RenderedEmail {
  const resume = `${siteUrl}/onboarding?resume=${candidate.event_id}`;
  const name = candidate.owner_name;
  const { next_step: next, completion_score: score } = candidate;

  const copy: Record<string, { subject: string; lead: string }> = {
    draft_1h: {
      subject: "Your invitation is waiting",
      lead: `You started an invitation a little while ago. It's saved — pick up wherever you left off, starting with ${next}.`,
    },
    draft_24h: {
      subject: `You're ${score}% of the way there`
        .replace("100%", "nearly finished"),
      lead: `Your invitation is ${score}% complete. The next thing it needs is ${next}.`,
    },
    draft_72h: {
      subject: "Your invitation is almost ready to share",
      lead: `You're ${score}% done — genuinely close. All that's left is ${next}, and then it's ready for your guests.`,
    },
    draft_7d: {
      subject: "Still holding your invitation",
      lead: `Your draft is safe and exactly as you left it. When you're ready, it needs ${next}.`,
    },
    draft_30d: {
      subject: "Last note about your invitation",
      lead: `This is the last time we'll write about this draft. It's still here if you want it — it needs ${next}.`,
    },
  };

  const { subject, lead } = copy[candidate.kind] ?? copy.draft_1h;

  const dateLine =
    candidate.event_date && candidate.days_until_event !== null
      ? `${candidate.event_date} · ${candidate.days_until_event} days away`
      : null;

  const text = [
    `Hi ${name},`,
    "",
    lead,
    "",
    ...(dateLine ? [dateLine, ""] : []),
    `Continue: ${resume}`,
    "",
    "— Amantrika",
  ].join("\n");

  return {
    subject,
    text,
    html: emailLayout({
      heading: subject,
      body: [`<p>Hi ${name},</p>`, `<p>${lead}</p>`, dateLine ? `<p><em>${dateLine}</em></p>` : ""]
        .filter(Boolean)
        .join(""),
      cta: { label: "Continue your invitation", href: resume },
    }),
  };
}

export async function runAbandonedDraftNudges(options: {
  dryRun: boolean;
}): Promise<CronJobResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("cron_stale_draft_nudges");

  if (error) {
    return { job: WORKFLOW, considered: 0, sent: 0, skipped: 0, failed: 0, error: error.message };
  }

  const candidates = (data ?? []) as Candidate[];
  const result: CronJobResult = {
    job: WORKFLOW,
    considered: candidates.length,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  for (const candidate of candidates) {
    const outcome = await claimAndSend(
      {
        workflow: WORKFLOW,
        kind: candidate.kind,
        subjectType: "event",
        subjectId: candidate.event_id,
        dedupeKey: candidate.dedupe_key,
        to: candidate.owner_email,
        email: render(candidate),
        // Every nudge carries one-click unsubscribe, honoured immediately.
        optOutScope: "nudge",
      },
      options
    );

    if (outcome === "sent") result.sent += 1;
    else if (outcome === "failed") result.failed += 1;
    else result.skipped += 1;
  }

  return result;
}
