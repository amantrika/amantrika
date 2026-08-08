-- Workflow 06a — first RSVP alert to the host. Runs every 10 minutes.
--
-- The first yes is the moment the product becomes real to a host: the thing
-- they built got a response from a person. It is worth an immediate email;
-- every subsequent one is worth a daily digest (06b) and nothing more.
--
-- Guest names and RSVP messages are deliberately absent. The host is entitled
-- to that data, but email is not the authenticated dashboard (CLAUDE.md rule
-- 12), so the email carries the fact and the link, and /dashboard carries the
-- detail. The one exception is the attending value, which is not identifying.

select
  e.id::text     as event_id,
  e.slug,
  e.title,
  p.email        as owner_email,
  coalesce(nullif(trim(p.full_name), ''), 'there') as owner_name,
  first_rsvp.attending::text as attending,
  first_rsvp.headcount,
  to_char(first_rsvp.created_at at time zone 'Asia/Kolkata', 'DD Mon, HH24:MI') as received_ist,
  'first_rsvp:' || e.id::text as dedupe_key
from events e
join profiles p on p.id = e.owner_id
join lateral (
  select r.attending, r.headcount, r.created_at
  from rsvps r
  where r.event_id = e.id
  order by r.created_at asc
  limit 1
) first_rsvp on true
where e.status = 'published'
  and p.email is not null
  -- Bounds the scan and lets an n8n outage under a week self-heal.
  and first_rsvp.created_at > now() - interval '7 days'
  and not exists (
    select 1 from automation.notifications n
    where n.dedupe_key = 'first_rsvp:' || e.id::text
  )
  and not exists (
    select 1 from automation.optouts o
    where o.recipient_hash = automation.hash_email(p.email)
      and o.scope in ('all', 'digest')
  )
order by first_rsvp.created_at asc
limit 50;
