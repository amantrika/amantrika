-- Workflow 08 — expiry warning and archive offer. Runs daily 04:30 UTC = 10:00 IST.
--
-- Spec §14 calls the archive offer "the easiest margin in the product":
-- sentimentality peaks around a month after the celebration and hosting cost is
-- near zero. This workflow is the only reason that revenue exists.
--
-- TWO HONEST LIMITATIONS, both structural rather than laziness:
--
--   1. This workflow MUTATES NOTHING. event_status is
--      ('draft','published','archived') — there is no 'expired' value
--      (core_schema.sql:14). Adding one changes what /invite/[slug] renders and
--      belongs in an app phase, not in a side-car. So these are warnings; the
--      invitation stays live until someone changes the enum.
--
--   2. There is no archive SKU. `plans` holds free/classic/premium only, so the
--      archive CTA links to /pricing#archive rather than opening a checkout.
--      Wiring it to money needs a plans row and a Dodo product id first.
--
-- Expiry is derived (main_datetime + 30 days) via automation.invite_expiry
-- rather than read from a stored expires_at, which does not exist yet.

with candidates as (
  select
    x.*,
    (x.expires_at::date - current_date)       as days_to_expiry,
    (current_date - x.archive_offer_at::date) as days_since_offer_due
  from automation.invite_expiry x
)
select
  c.event_id::text as event_id,
  c.slug,
  c.title,
  c.plan_code,
  p.email          as owner_email,
  coalesce(nullif(trim(p.full_name), ''), 'there') as owner_name,
  to_char(c.main_datetime at time zone 'Asia/Kolkata', 'DD Mon YYYY') as event_date,
  to_char(c.expires_at    at time zone 'Asia/Kolkata', 'DD Mon YYYY') as expires_on,
  c.days_to_expiry,
  k.kind,
  -- What they would lose, which is the only argument the archive email needs.
  (select count(*) from page_views v where v.event_id = c.event_id)                  as total_views,
  (select count(*) from rsvps r where r.event_id = c.event_id and r.attending = 'yes') as rsvp_yes,
  (select count(*) from blessings b where b.event_id = c.event_id and b.is_approved)  as blessings,
  (select count(*) from assets a where a.event_id = c.event_id and a.kind = 'photo')  as photos,
  'expiry:' || c.event_id::text || ':' || k.kind as dedupe_key
from candidates c
join profiles p on p.id = c.owner_id
join lateral (
  select case
    -- Checked most-urgent-first so a single row never matches two kinds.
    when c.days_since_offer_due between 0 and 2 then 'archive_offer'
    when c.days_to_expiry = 1                   then 'expiry_1d'
    when c.days_to_expiry between 6 and 7       then 'expiry_7d'
  end as kind
) k on k.kind is not null
where p.email is not null
  and not exists (
    select 1 from automation.notifications n
    where n.dedupe_key = 'expiry:' || c.event_id::text || ':' || k.kind
  )
  and not exists (
    select 1 from automation.optouts o
    where o.recipient_hash = automation.hash_email(p.email)
      and o.scope in ('all', 'reminder')
  )
order by c.days_to_expiry asc
limit 200;
