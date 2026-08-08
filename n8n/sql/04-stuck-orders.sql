-- Workflow 04 — stuck-order sweeper. Runs every 30 minutes.
--
-- Two populations that look identical in the orders table and mean completely
-- different things:
--
--   severity = 'critical'  A verified payment.succeeded exists in the
--                          payment_events ledger, but the order is still
--                          pending. The webhook took the money and did not
--                          publish. Someone has paid for an invitation they
--                          cannot share. Alert immediately, every time.
--
--   severity = 'info'      Pending with no webhook delivery at all. Almost
--                          always an abandoned checkout. Counted into the daily
--                          digest, never alerted individually — alerting on
--                          these would train you to ignore the channel.
--
-- The critical case is the single most valuable thing in this folder: nothing
-- in the app currently detects it. src/app/api/payments/webhook/route.ts only
-- log.warn()s on a settle failure, and log.warn goes to PostHog, which nobody
-- watches at 2am.

select
  o.id::text          as order_id,
  o.event_id::text    as event_id,
  o.plan_code,
  o.amount_inr,
  o.provider,
  o.provider_payment_id,
  o.failure_reason,
  e.slug,
  e.title,
  e.status::text      as event_status,
  automation.mask_email(p.email) as buyer_email_masked,
  to_char(o.created_at at time zone 'Asia/Kolkata', 'DD Mon, HH24:MI') as created_ist,
  round(extract(epoch from (now() - o.created_at)) / 60)::int as minutes_pending,
  pe.event_type       as webhook_event_type,
  case when pe.event_id is not null then 'critical' else 'info' end as severity,
  'stuck_order:' || o.id::text as dedupe_key
from orders o
join events   e on e.id = o.event_id
join profiles p on p.id = o.buyer_id
-- The most advanced delivery we have seen for this order.
left join lateral (
  select pe.event_id, pe.event_type
  from payment_events pe
  where pe.order_id = o.id
    and pe.event_type = 'payment.succeeded'
  order by pe.received_at desc
  limit 1
) pe on true
left join automation.notifications n
  on n.dedupe_key = 'stuck_order:' || o.id::text
where o.status = 'pending'
  and o.created_at < now() - (
    (select value from automation.settings where key = 'stuck_order_minutes')::int
    * interval '1 minute'
  )
  -- Beyond a week it is history, not an incident.
  and o.created_at > now() - interval '7 days'
  and n.id is null
order by (pe.event_id is not null) desc, o.created_at asc
limit 50;
