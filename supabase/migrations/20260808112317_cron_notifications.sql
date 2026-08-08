-- Makes the automation ledger reachable from the Next.js app, so the scheduler
-- can live in `/api/cron/*` instead of in a second deployment.
--
-- The ledger stays exactly where it is, in the `automation` schema, unexposed to
-- PostgREST — that design note in 20260808041157 is right and this migration
-- does not weaken it. Instead the app gets three narrow `security definer`
-- functions in `public`, executable by `service_role` only. The table remains
-- invisible; what is callable is a verb, not a grant.

-- ------------------------------------------------------------- claim

-- Claim a send before making it. Returns the ledger id when this run owns the
-- message, or null when an earlier run already claimed it — in which case the
-- caller must not send.
--
-- This is the whole idempotency mechanism, unchanged: the unique index on
-- dedupe_key arbitrates overlapping schedules, a retried cron delivery, and a
-- manual run during a scheduled one.
create function public.notification_claim(
  p_workflow     text,
  p_kind         text,
  p_subject_type text,
  p_subject_id   uuid,
  p_dedupe_key   text,
  p_channel      text,
  p_email        text,
  p_payload      jsonb default '{}'::jsonb
)
returns uuid
language sql
security definer
set search_path = public, automation
as $$
  insert into automation.notifications
    (workflow, kind, subject_type, subject_id, dedupe_key, channel, recipient_hash, payload)
  values
    (p_workflow, p_kind, p_subject_type, p_subject_id, p_dedupe_key, p_channel,
     automation.hash_email(p_email), coalesce(p_payload, '{}'::jsonb))
  on conflict (dedupe_key) do nothing
  returning id;
$$;

comment on function public.notification_claim is
  'Claims a send before it is made. Null means someone else already owns it — do not send.';

-- ------------------------------------------------------------- settle

-- Records the outcome. Merging the payload rather than replacing it keeps the
-- rendered body a dry run wrote, so a dry run stays a proofreading artifact.
create function public.notification_mark(
  p_id      uuid,
  p_status  text,
  p_payload jsonb default '{}'::jsonb,
  p_error   text default null
)
returns void
language sql
security definer
set search_path = public, automation
as $$
  update automation.notifications
     set status  = p_status,
         payload = payload || coalesce(p_payload, '{}'::jsonb),
         error   = p_error,
         sent_at = case when p_status = 'sent' then now() else sent_at end
   where id = p_id;
$$;

-- ------------------------------------------------------------- candidates

-- Workflow 05, ported verbatim from n8n/sql/05-stale-drafts.sql.
--
-- Spec §15. Five messages keyed to idle time and gated on completion score:
--
--   draft_1h    score < 30   "your invitation is waiting"
--   draft_24h   30..70       names the exact missing field
--   draft_72h   score > 70   the one that converts
--   draft_7d    any          value reminder
--   draft_30d   any          final, prominent opt-out
--
-- Three rules matter more than the copy: a draft enters at whichever bucket its
-- idle time lands in and is never backfilled through earlier ones; once a later
-- message has gone out the earlier ones are permanently off the table, so
-- editing a draft and going quiet again cannot restart the sequence; and a
-- published invitation, a past date or an opted-out recipient is never nudged.
create function public.cron_stale_draft_nudges()
returns table (
  event_id          text,
  slug              text,
  title             text,
  owner_email       text,
  owner_name        text,
  kind              text,
  completion_score  int,
  next_step         text,
  hours_idle        int,
  event_date        text,
  days_until_event  int,
  dedupe_key        text
)
language sql
security definer
set search_path = public, automation
as $$
  with ranked as (
    select
      d.*,
      p.email as owner_email,
      coalesce(nullif(trim(p.full_name), ''), 'there') as owner_name,
      case
        when d.hours_idle >= 720 then 'draft_30d'
        when d.hours_idle >= 168 then 'draft_7d'
        when d.hours_idle >= 72  then 'draft_72h'
        when d.hours_idle >= 24  then 'draft_24h'
        when d.hours_idle >= 1   then 'draft_1h'
      end as kind,
      (select value::int from automation.settings where key = 'nudge_score_low')  as score_low,
      (select value::int from automation.settings where key = 'nudge_score_high') as score_high
    from automation.stale_drafts d
    join profiles p on p.id = d.owner_id
    where p.email is not null
      and (d.main_datetime is null or d.main_datetime > now())
  ),
  scored as (
    select r.*,
      case r.kind
        when 'draft_1h'  then 1 when 'draft_24h' then 2 when 'draft_72h' then 3
        when 'draft_7d'  then 4 when 'draft_30d' then 5
      end as rank
    from ranked r
    where r.kind is not null
      and case r.kind
        when 'draft_1h'  then r.completion_score <  r.score_low
        when 'draft_24h' then r.completion_score >= r.score_low
                          and r.completion_score <= r.score_high
        when 'draft_72h' then r.completion_score >  r.score_high
        else true
      end
  )
  select
    s.event_id::text,
    s.slug,
    s.title,
    s.owner_email,
    s.owner_name,
    s.kind,
    s.completion_score::int,
    s.next_step,
    round(s.hours_idle)::int,
    to_char(s.main_datetime at time zone 'Asia/Kolkata', 'DD Mon YYYY'),
    case
      when s.main_datetime is null then null
      else greatest((s.main_datetime::date - current_date), 0)
    end::int,
    'nudge:' || s.event_id::text || ':' || s.kind
  from scored s
  where not exists (
    select 1 from automation.notifications n
    where n.dedupe_key = 'nudge:' || s.event_id::text || ':' || s.kind
  )
  and not exists (
    select 1 from automation.notifications n
    where n.subject_id = s.event_id
      and n.workflow = '05-host-abandoned-draft-nudge'
      and case n.kind
        when 'draft_1h'  then 1 when 'draft_24h' then 2 when 'draft_72h' then 3
        when 'draft_7d'  then 4 when 'draft_30d' then 5 else 0
      end >= s.rank
  )
  and not exists (
    select 1 from automation.optouts o
    where o.recipient_hash = automation.hash_email(s.owner_email)
      and o.scope in ('all', 'nudge')
  )
  order by s.rank desc, s.updated_at asc
  limit 100;
$$;

-- ------------------------------------------------------------- unsubscribe

-- Honoured immediately (spec §15), and keyed by hash so declining to be emailed
-- does not require us to keep the address.
create function public.notification_optout(p_email text, p_scope text default 'all')
returns void
language sql
security definer
set search_path = public, automation
as $$
  insert into automation.optouts (recipient_hash, scope, note)
  values (automation.hash_email(p_email), p_scope, 'one-click unsubscribe')
  on conflict (recipient_hash, scope) do nothing;
$$;

-- ------------------------------------------------------------- grants

-- `security definer` in `public` is reachable by every PostgREST role unless
-- revoked. Only the service role — which means only a Route Handler — may run
-- these. A signed-in host must not be able to claim a send or read the ledger.
revoke execute on function
  public.notification_claim(text, text, text, uuid, text, text, text, jsonb),
  public.notification_mark(uuid, text, jsonb, text),
  public.cron_stale_draft_nudges(),
  public.notification_optout(text, text)
from public, anon, authenticated;

grant execute on function
  public.notification_claim(text, text, text, uuid, text, text, text, jsonb),
  public.notification_mark(uuid, text, jsonb, text),
  public.cron_stale_draft_nudges(),
  public.notification_optout(text, text)
to service_role;
