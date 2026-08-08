-- Workflow 05 — abandoned-draft nudge drip. Runs hourly.
--
-- Spec §15. Five messages keyed to idle time and gated on completion score, so
-- the email a host gets depends on how far in they actually are:
--
--   draft_1h    score < 30   "your invitation is waiting"
--   draft_24h   30..70       "you're X% done" — names the exact missing field
--   draft_72h   score > 70   the one that converts
--   draft_7d    any          value reminder
--   draft_30d   any          final, prominent opt-out
--
-- Three rules that matter more than the copy:
--
--   1. A draft enters at whichever bucket its idle time lands in. It is never
--      backfilled through earlier ones — nobody receives a 1h nudge on day four.
--   2. Once a later message has gone out, earlier ones are permanently off the
--      table (the `later_sent` guard). Without it, editing a draft and going
--      quiet again would restart the sequence.
--   3. Never nudge a published or archived invitation, one whose date has
--      already passed, or an opted-out recipient. §15 states this explicitly
--      and it is the difference between a nudge and spam.
--
-- Simplification vs the spec: there is no resume_token / /resume/[token] route
-- in the app yet, so the CTA is /onboarding?resume=<event_id> behind normal
-- auth. Noted in n8n/README.md as a follow-up.

with ranked as (
  select
    d.*,
    p.email      as owner_email,
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
    -- Never nudge about a celebration that has already happened.
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
  s.event_id::text  as event_id,
  s.slug,
  s.title,
  s.theme_id,
  s.event_type::text as event_type,
  s.owner_email,
  s.owner_name,
  s.kind,
  s.completion_score,
  s.next_step,
  round(s.hours_idle)::int as hours_idle,
  to_char(s.main_datetime at time zone 'Asia/Kolkata', 'DD Mon YYYY') as event_date,
  case
    when s.main_datetime is null then null
    else greatest((s.main_datetime::date - current_date), 0)
  end as days_until_event,
  'nudge:' || s.event_id::text || ':' || s.kind as dedupe_key
from scored s
-- This exact message has not gone out...
where not exists (
  select 1 from automation.notifications n
  where n.dedupe_key = 'nudge:' || s.event_id::text || ':' || s.kind
)
-- ...and no later message in the sequence has either.
and not exists (
  select 1 from automation.notifications n
  where n.subject_id = s.event_id
    and n.workflow = '05-host-abandoned-draft-nudge'
    and case n.kind
      when 'draft_1h'  then 1 when 'draft_24h' then 2 when 'draft_72h' then 3
      when 'draft_7d'  then 4 when 'draft_30d' then 5 else 0
    end >= s.rank
)
-- ...and they have not opted out.
and not exists (
  select 1 from automation.optouts o
  where o.recipient_hash = automation.hash_email(s.owner_email)
    and o.scope in ('all', 'nudge')
)
order by s.rank desc, s.updated_at asc
limit 100;
