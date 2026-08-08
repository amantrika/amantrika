-- Shared ledger operations. Every workflow uses these three statements verbatim;
-- they are duplicated into the workflow JSON but this file is the source of truth.
-- If you change the claim semantics, change them here first.

-- ---------------------------------------------------------------- 1. claim
--
-- Run once per candidate, BEFORE sending. Returns a row if this run owns the
-- send; returns nothing if some earlier run already claimed it, in which case
-- the workflow drops the item.
--
-- This is the whole idempotency story. It survives overlapping schedules, a
-- second n8n instance, and a manual "Execute Workflow" click during a scheduled
-- run, because the unique index on dedupe_key arbitrates all of them.

insert into automation.notifications
  (workflow, kind, subject_type, subject_id, dedupe_key, channel, recipient_hash, payload)
values
  ($1, $2, $3, $4::uuid, $5, $6, automation.hash_email($7), $8::jsonb)
on conflict (dedupe_key) do nothing
returning id, dedupe_key;


-- ---------------------------------------------------------------- 2. confirm
--
-- Run after the provider accepts the message.

update automation.notifications
set status = 'sent', sent_at = now(), payload = payload || $2::jsonb
where id = $1::uuid;


-- ---------------------------------------------------------------- 3. record failure
--
-- Run on the error branch. The row stays, so the item is NOT retried on the
-- next schedule — a failed nudge is not worth a retry storm, and the runbook
-- query below surfaces it. Delete the row by hand to force a resend.

update automation.notifications
set status = 'failed', error = $2
where id = $1::uuid;


-- ---------------------------------------------------------------- 4. dry run
--
-- Used instead of (2) when AMANTRIKA_DRY_RUN is true. Keeps the rendered body
-- so a dry run is a proofreading pass, not just a count.

update automation.notifications
set status = 'skipped', payload = payload || $2::jsonb
where id = $1::uuid;


-- ================================================================ runbook

-- Stranded between claim and send. Anything here for more than an hour means a
-- workflow died mid-run. Investigate before deleting; deleting makes it resend.
select id, workflow, kind, subject_type, subject_id, claimed_at, error
from automation.notifications
where status = 'claimed' and claimed_at < now() - interval '1 hour'
order by claimed_at;

-- What went out yesterday, by workflow.
select workflow, kind, status, count(*)
from automation.notifications
where claimed_at > now() - interval '1 day'
group by 1, 2, 3
order by 1, 2;

-- Clear a dry run so the same candidates can be re-tested.
-- delete from automation.notifications where status = 'skipped';
