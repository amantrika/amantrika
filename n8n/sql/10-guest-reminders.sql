-- Workflow 10 — guest event reminders at 7 days and 1 day. Runs daily 03:30 UTC = 09:00 IST.
--
-- The most privacy-sensitive workflow in the folder, so the rules are strict:
--
--   * Only guests who said YES. A maybe is not consent to be reminded, and a no
--     is an explicit one.
--   * Only guests whose email the host actually captured — guests.email is
--     nullable and usually null.
--   * Only published invitations. A guest should never receive mail about a
--     draft.
--   * The ledger stores automation.hash_email(g.email), never the address
--     (CLAUDE.md rule 12). The address exists in n8n memory for the length of
--     one HTTP call to Resend and is written nowhere.
--
-- NO WHATSAPP. project-overview.md §18: "respect WhatsApp's terms; do not build
-- an unofficial automation". Guest messaging is email plus deep links only. The
-- WhatsApp path in this folder goes to the owner's own number over the official
-- Cloud API and nowhere else.
--
-- Sends the personalised link (?t=<invite_token>) when the guest has one, so
-- the reminder lands on their own RSVP rather than a generic page.

with windowed as (
  select
    e.id as event_id, e.slug, e.title, e.city, e.main_datetime, e.timezone,
    case
      when e.main_datetime::date - current_date = 1 then 'reminder_1d'
      when e.main_datetime::date - current_date = 7 then 'reminder_7d'
    end as kind
  from events e
  where e.status = 'published'
    and e.main_datetime is not null
    and coalesce((e.settings ->> 'rsvpEnabled')::boolean, true)
)
select
  w.event_id::text as event_id,
  w.slug,
  w.title,
  w.city,
  w.kind,
  g.id::text       as guest_id,
  g.name           as guest_name,
  g.email          as guest_email,
  g.headcount,
  g.invite_token,
  to_char(w.main_datetime at time zone 'Asia/Kolkata', 'Day, DD Month YYYY') as event_date_long,
  to_char(w.main_datetime at time zone 'Asia/Kolkata', 'HH12:MI AM')         as event_time,
  -- Google Calendar deep links want UTC basic-format timestamps.
  to_char(w.main_datetime at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"')      as gcal_start,
  to_char(w.main_datetime at time zone 'UTC' + interval '3 hours',
          'YYYYMMDD"T"HH24MISS"Z"')                                          as gcal_end,

  -- Only the ceremonies this guest was actually invited to.
  (select coalesce(jsonb_agg(jsonb_build_object(
            'name', s.name, 'venue', s.venue, 'address', s.address,
            'when', coalesce(s.time_label,
                     to_char(s.starts_at at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI AM')),
            'dress_code', s.dress_code, 'map_url', s.map_url)
          order by s.sort_order), '[]'::jsonb)
     from sub_events s
     where s.event_id = w.event_id
       and (cardinality(g.invited_keys) = 0 or s.key = any(g.invited_keys))
  ) as ceremonies,

  'guest_reminder:' || g.id::text || ':' || w.kind as dedupe_key
from windowed w
join guests g on g.event_id = w.event_id
where w.kind is not null
  and g.email is not null
  and trim(g.email) <> ''
  -- Their most recent response must be a yes.
  and exists (
    select 1 from rsvps r
    where r.guest_id = g.id and r.attending = 'yes'
  )
  and not exists (
    select 1 from automation.notifications n
    where n.dedupe_key = 'guest_reminder:' || g.id::text || ':' || w.kind
  )
  and not exists (
    select 1 from automation.optouts o
    where o.recipient_hash = automation.hash_email(g.email)
      and o.scope in ('all', 'reminder')
  )
order by w.main_datetime asc, g.name asc
limit 500;
