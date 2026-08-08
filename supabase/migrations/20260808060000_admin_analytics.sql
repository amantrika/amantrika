-- Admin analytics: a windowed overview that can be compared against the
-- preceding window, plus the breakdowns worth seeing.
--
-- The existing `admin_overview()` reports all-time totals, which cannot show a
-- trend: "₹18,000 revenue" says nothing about whether things are improving.
-- Every figure here is scoped to a window and paired with the same figure for
-- the window immediately before it, so the UI can render a direction without
-- doing arithmetic across two round trips.

/**
 * Windowed totals plus the previous window's, for period-over-period movement.
 *
 * `security invoker`, so RLS still applies — a non-admin calling this gets zeros
 * rather than the platform's numbers.
 */
create or replace function admin_analytics(p_days int default 30)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with
  bounds as (
    select
      now() - (p_days || ' days')::interval          as curr_from,
      now()                                          as curr_to,
      now() - (p_days * 2 || ' days')::interval      as prev_from,
      now() - (p_days || ' days')::interval          as prev_to
  )
  select jsonb_build_object(
    'days', p_days,

    'current', jsonb_build_object(
      'signups',      (select count(*) from profiles, bounds
                        where created_at >= curr_from and created_at < curr_to),
      'invites',      (select count(*) from events, bounds
                        where created_at >= curr_from and created_at < curr_to
                          and showcase_source_id is null),
      'published',    (select count(*) from events, bounds
                        where published_at >= curr_from and published_at < curr_to),
      'revenue_inr',  (select coalesce(sum(amount_inr), 0) from orders, bounds
                        where status = 'paid' and paid_at >= curr_from and paid_at < curr_to),
      'orders',       (select count(*) from orders, bounds
                        where status = 'paid' and paid_at >= curr_from and paid_at < curr_to),
      'views',        (select count(*) from page_views, bounds
                        where occurred_at >= curr_from and occurred_at < curr_to),
      'rsvps',        (select count(*) from rsvps, bounds
                        where created_at >= curr_from and created_at < curr_to),
      'badge_clicks', (select count(*) from badge_clicks, bounds
                        where occurred_at >= curr_from and occurred_at < curr_to)
    ),

    'previous', jsonb_build_object(
      'signups',      (select count(*) from profiles, bounds
                        where created_at >= prev_from and created_at < prev_to),
      'invites',      (select count(*) from events, bounds
                        where created_at >= prev_from and created_at < prev_to
                          and showcase_source_id is null),
      'published',    (select count(*) from events, bounds
                        where published_at >= prev_from and published_at < prev_to),
      'revenue_inr',  (select coalesce(sum(amount_inr), 0) from orders, bounds
                        where status = 'paid' and paid_at >= prev_from and paid_at < prev_to),
      'orders',       (select count(*) from orders, bounds
                        where status = 'paid' and paid_at >= prev_from and paid_at < prev_to),
      'views',        (select count(*) from page_views, bounds
                        where occurred_at >= prev_from and occurred_at < prev_to),
      'rsvps',        (select count(*) from rsvps, bounds
                        where created_at >= prev_from and created_at < prev_to),
      'badge_clicks', (select count(*) from badge_clicks, bounds
                        where occurred_at >= prev_from and occurred_at < prev_to)
    ),

    -- Breakdowns are all-time on purpose: "which occasions do people use us
    -- for" is a question about the whole product, not about the last 30 days.
    'by_occasion', coalesce((
      select jsonb_agg(t order by t.count desc)
      from (
        select event_type::text as label, count(*) as count
        from events where showcase_source_id is null
        group by event_type
      ) t
    ), '[]'::jsonb),

    'by_status', coalesce((
      select jsonb_agg(t order by t.count desc)
      from (
        select status::text as label, count(*) as count
        from events where showcase_source_id is null
        group by status
      ) t
    ), '[]'::jsonb),

    'by_theme', coalesce((
      select jsonb_agg(t order by t.count desc)
      from (
        select theme_id as label, count(*) as count
        from events where showcase_source_id is null
        group by theme_id
        limit 8
      ) t
    ), '[]'::jsonb),

    'by_plan', coalesce((
      select jsonb_agg(t order by t.revenue_inr desc)
      from (
        select plan_code as label, count(*) as count,
               coalesce(sum(amount_inr), 0) as revenue_inr
        from orders where status = 'paid'
        group by plan_code
      ) t
    ), '[]'::jsonb)
  );
$$;

grant execute on function admin_analytics(int) to authenticated;
