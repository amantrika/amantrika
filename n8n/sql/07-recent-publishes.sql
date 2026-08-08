-- Workflow 07 — publish confirmation and share kit. Runs every 10 minutes.
--
-- There are two publish paths in this codebase and only one of them sends mail:
--
--   paid  src/app/api/payments/webhook/route.ts settles the order, publishes,
--         and calls sendConfirmation() — a receipt. These hosts already heard
--         from us, so `variant = 'share_kit'` sends the sharing tools only.
--         Sending a second confirmation would look like a double charge.
--
--   free  src/app/onboarding/actions.ts:317-326 publishes inline. The webhook
--         never runs, so today these hosts receive nothing at all. They get
--         `variant = 'confirmation'` — the full message.
--
-- The entitlement note matters for the copy: on the free plan the invitation is
-- watermarked and emits no og:image by design (src/lib/entitlements.ts), so the
-- free email must not promise a rich WhatsApp preview it will not deliver. It
-- points at the upgrade instead.

select
  e.id::text     as event_id,
  e.slug,
  e.title,
  e.plan_code,
  e.theme_id,
  e.event_type::text as event_type,
  e.city,
  p.email        as owner_email,
  coalesce(nullif(trim(p.full_name), ''), 'there') as owner_name,
  to_char(e.main_datetime at time zone 'Asia/Kolkata', 'DD Mon YYYY')      as event_date,
  to_char(e.main_datetime at time zone 'Asia/Kolkata', 'Day, DD Month YYYY') as event_date_long,
  e.plan_code = 'free' as is_watermarked,
  case when paid.id is not null then 'share_kit' else 'confirmation' end as variant,
  paid.amount_inr,
  paid.plan_name,
  (select count(*) from guests g where g.event_id = e.id) as guests_added,
  'published:' || e.id::text as dedupe_key
from events e
join profiles p on p.id = e.owner_id
left join lateral (
  select o.id, o.amount_inr, pl.name as plan_name
  from orders o
  join plans pl on pl.code = o.plan_code
  where o.event_id = e.id and o.status = 'paid'
  order by o.paid_at desc
  limit 1
) paid on true
where e.status = 'published'
  and e.published_at > now() - interval '24 hours'
  and p.email is not null
  and not exists (
    select 1 from automation.notifications n
    where n.dedupe_key = 'published:' || e.id::text
  )
order by e.published_at asc
limit 50;
