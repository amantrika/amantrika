-- Workflow 02 — daily owner digest. Runs 03:30 UTC = 09:00 IST.
--
-- IMPORTANT: this deliberately does NOT call admin_overview() or
-- admin_daily_series(). Those are `security invoker` and gate internally on
-- is_admin(), which reads auth.uid(). Over a direct Postgres connection
-- auth.uid() is null, so both functions return zeros rather than raising —
-- a silently wrong digest every morning. Plain SQL is the only safe option
-- from n8n.
--
-- One row, one object, so the workflow has nothing to assemble.

with window_bounds as (
  select now() - interval '24 hours' as d1,
         now() - interval '7 days'   as d7,
         now() - interval '30 days'  as d30
)
select
  to_char(now() at time zone 'Asia/Kolkata', 'Dy DD Mon YYYY')       as report_date,
  to_char((now() at time zone 'Asia/Kolkata')::date, 'YYYY-MM-DD')   as dedupe_date,

  -- acquisition
  (select count(*) from profiles, window_bounds where created_at > d1)  as signups_24h,
  (select count(*) from profiles, window_bounds where created_at > d7)  as signups_7d,

  -- build funnel
  (select count(*) from events, window_bounds where created_at > d1)    as invites_created_24h,
  (select count(*) from events where status = 'draft')                  as drafts_open,
  (select count(*) from events, window_bounds
     where status = 'published' and published_at > d1)                  as published_24h,
  (select count(*) from events where status = 'published')              as published_total,

  -- money
  (select coalesce(sum(amount_inr), 0) from orders, window_bounds
     where status = 'paid' and paid_at > d1)                            as revenue_24h,
  (select coalesce(sum(amount_inr), 0) from orders, window_bounds
     where status = 'paid' and paid_at > d30)                           as revenue_30d,
  (select coalesce(sum(amount_inr), 0) from orders where status = 'paid') as revenue_all,
  (select count(*) from orders, window_bounds
     where status = 'paid' and paid_at > d1)                            as orders_paid_24h,
  (select coalesce(sum(amount_inr), 0) from commissions
     where status in ('accrued', 'payable'))                            as commission_owed,

  -- things that need a decision from you
  (select count(*) from agents where status = 'pending')                as partners_pending,
  (select count(*) from orders, window_bounds
     where status = 'pending' and created_at < now() - interval '30 minutes'
       and created_at > d7)                                             as orders_stuck,
  (select count(*) from orders, window_bounds
     where status = 'failed' and created_at > d1)                       as orders_failed_24h,
  (select count(*) from blessings b join events e on e.id = b.event_id
     where b.is_approved = false
       and coalesce((e.settings ->> 'moderateBlessings')::boolean, false))
                                                                        as blessings_awaiting,

  -- guest side
  (select count(*) from page_views, window_bounds where occurred_at > d1) as views_24h,
  (select count(distinct visitor_hash) from page_views, window_bounds
     where occurred_at > d1)                                            as unique_visitors_24h,
  (select count(*) from rsvps, window_bounds where created_at > d1)      as rsvps_24h,

  -- top five invitations by yesterday's traffic, as a ready-to-render array
  (select coalesce(jsonb_agg(t order by t.views desc), '[]'::jsonb)
     from (
       select e.slug, e.title, count(*) as views
       from page_views pv
       join events e on e.id = pv.event_id, window_bounds
       where pv.occurred_at > d1
       group by e.slug, e.title
       order by views desc
       limit 5
     ) t)                                                               as top_invites;
