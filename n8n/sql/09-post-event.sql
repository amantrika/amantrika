-- Workflow 09 — post-event wrap-up. Runs daily 05:00 UTC = 10:30 IST.
--
-- Two to three days after the celebration: late enough that the host is home
-- and the phone has stopped ringing, early enough that they still feel it.
-- The window is two days wide rather than exact so a single missed run does
-- not silently drop a host.
--
-- Three jobs in one email, in descending order of what the host cares about:
--   1. What their invitation did — views, RSVPs, blessings.
--   2. The showcase consent ask. This is the cheapest marketing asset the
--      product has, and this is the only moment the host is glad to say yes.
--      Links to the dashboard toggle, which writes showcase_consents properly
--      with the consent text and audit trail — n8n never touches consent state.
--   3. A review request, last, because asking before showing value is rude.
--
-- Skips invitations already showcased or already consented, so the ask is not
-- repeated at someone who has said yes.

select
  e.id::text  as event_id,
  e.slug,
  e.title,
  e.plan_code,
  e.event_type::text as event_type,
  p.email     as owner_email,
  coalesce(nullif(trim(p.full_name), ''), 'there') as owner_name,
  to_char(e.main_datetime at time zone 'Asia/Kolkata', 'DD Mon YYYY') as event_date,

  (select count(*) from page_views v where v.event_id = e.id)                        as total_views,
  (select count(distinct v.visitor_hash) from page_views v where v.event_id = e.id)  as unique_visitors,
  (select count(*) from rsvps r where r.event_id = e.id)                             as total_responses,
  (select count(*) from rsvps r where r.event_id = e.id and r.attending = 'yes')     as rsvp_yes,
  (select coalesce(sum(r.headcount), 0) from rsvps r
     where r.event_id = e.id and r.attending = 'yes')                                as total_heads,
  (select count(*) from blessings b where b.event_id = e.id and b.is_approved)       as blessings,
  (select count(*) from guests g where g.event_id = e.id)                            as guests_invited,
  -- Countries the link travelled to. NRI reach is the stat hosts screenshot.
  (select count(distinct v.country) from page_views v
     where v.event_id = e.id and v.country is not null)                              as countries,

  -- Only ask for what we do not already have.
  coalesce((e.permissions ->> 'showcase_consent')::boolean, false) as has_consent,
  e.is_showcased,
  'wrapup:' || e.id::text as dedupe_key
from events e
join profiles p on p.id = e.owner_id
where e.status = 'published'
  and e.main_datetime is not null
  and e.main_datetime < now() - interval '2 days'
  and e.main_datetime > now() - interval '4 days'
  and p.email is not null
  and not exists (
    select 1 from automation.notifications n
    where n.dedupe_key = 'wrapup:' || e.id::text
  )
  and not exists (
    select 1 from automation.optouts o
    where o.recipient_hash = automation.hash_email(p.email)
      and o.scope in ('all', 'digest')
  )
order by e.main_datetime asc
limit 100;
