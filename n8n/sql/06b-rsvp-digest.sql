-- Workflow 06b — daily RSVP digest. Runs 14:30 UTC = 20:00 IST.
--
-- Only for invitations with real movement: below automation.settings
-- 'rsvp_digest_threshold' new responses in 24h, silence is the better product.
-- A host with two RSVPs a day does not need a daily email about it.
--
-- Counts only, again. Names, phone numbers and RSVP messages stay behind auth.

with recent as (
  select
    r.event_id,
    count(*)                                                  as new_total,
    count(*) filter (where r.attending = 'yes')               as new_yes,
    count(*) filter (where r.attending = 'no')                as new_no,
    count(*) filter (where r.attending = 'maybe')             as new_maybe,
    coalesce(sum(r.headcount) filter (where r.attending = 'yes'), 0) as new_heads
  from rsvps r
  where r.created_at > now() - interval '24 hours'
  group by r.event_id
)
select
  e.id::text  as event_id,
  e.slug,
  e.title,
  p.email     as owner_email,
  coalesce(nullif(trim(p.full_name), ''), 'there') as owner_name,
  rc.new_total, rc.new_yes, rc.new_no, rc.new_maybe, rc.new_heads,

  -- Running totals, so the digest reads as a standing position rather than a delta.
  (select count(*) from rsvps r where r.event_id = e.id)                          as total_responses,
  (select count(*) from rsvps r where r.event_id = e.id and r.attending = 'yes')  as total_yes,
  (select coalesce(sum(r.headcount), 0) from rsvps r
     where r.event_id = e.id and r.attending = 'yes')                             as total_heads,
  (select count(*) from guests g where g.event_id = e.id)                         as guests_invited,

  -- Per-ceremony breakdown, ready to render.
  (select coalesce(jsonb_agg(jsonb_build_object('name', s.name, 'count', c.n)
            order by s.sort_order), '[]'::jsonb)
     from sub_events s
     join lateral (
       select count(*) as n from rsvps r
       where r.event_id = e.id and r.attending = 'yes' and s.key = any(r.sub_event_keys)
     ) c on true
     where s.event_id = e.id) as by_ceremony,

  case
    when e.main_datetime is null then null
    else greatest((e.main_datetime::date - current_date), 0)
  end as days_until_event,
  'rsvp_digest:' || e.id::text || ':'
    || to_char((now() at time zone 'Asia/Kolkata')::date, 'YYYY-MM-DD') as dedupe_key
from recent rc
join events   e on e.id = rc.event_id
join profiles p on p.id = e.owner_id
where e.status = 'published'
  and p.email is not null
  and rc.new_total >= (select value::int from automation.settings where key = 'rsvp_digest_threshold')
  and not exists (
    select 1 from automation.notifications n
    where n.dedupe_key = 'rsvp_digest:' || e.id::text || ':'
      || to_char((now() at time zone 'Asia/Kolkata')::date, 'YYYY-MM-DD')
  )
  and not exists (
    select 1 from automation.optouts o
    where o.recipient_hash = automation.hash_email(p.email)
      and o.scope in ('all', 'digest')
  )
order by rc.new_total desc
limit 200;
