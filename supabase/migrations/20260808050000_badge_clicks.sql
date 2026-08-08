-- "Made with Amantrika" badge clicks.
--
-- This is the product's only organic acquisition loop: a guest sees an
-- invitation, taps the badge, and lands on the marketing site. Counting it tells
-- us which invitations actually bring people back, which is the difference
-- between the badge being a growth channel and being decoration.

create table badge_clicks (
  id           bigserial primary key,
  -- Null when the badge is clicked from a bundled demo invitation, which has no row.
  event_id     uuid references events(id) on delete cascade,
  slug         text not null,
  occurred_at  timestamptz not null default now(),
  -- Same salted daily hash as page_views: enough to separate people within a
  -- day, deliberately useless for following anyone across days.
  visitor_hash text,
  country      text,
  -- Which mark was tapped, if we ever place more than one.
  placement    text
);

create index badge_clicks_event_idx on badge_clicks(event_id, occurred_at desc);
create index badge_clicks_slug_idx on badge_clicks(slug, occurred_at desc);

alter table badge_clicks enable row level security;

-- A host sees clicks on their own invitation; nobody reads anyone else's.
create policy "managers read badge clicks" on badge_clicks
  for select using (event_id is not null and can_manage_event(event_id));

create policy "admins read all badge clicks" on badge_clicks
  for select using (is_admin());

/**
 * Records a click. `security definer` so an anonymous guest can be counted
 * without granting the anon role a blanket insert, exactly as `record_page_view`
 * does.
 *
 * Unknown or unpublished slugs are ignored silently rather than erroring —
 * failing here would break the guest's navigation for a metric.
 */
create or replace function record_badge_click(
  p_slug text,
  p_visitor_hash text default null,
  p_country text default null,
  p_placement text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  select id into v_event_id from events where slug = p_slug and status = 'published';

  insert into badge_clicks (event_id, slug, visitor_hash, country, placement)
  values (v_event_id, p_slug, p_visitor_hash, p_country, p_placement);
end;
$$;

grant execute on function record_badge_click(text, text, text, text) to anon, authenticated;

-- Surface badge clicks alongside the numbers a host already sees.
create or replace function event_stats(p_event_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'total_views',    (select count(*) from page_views where event_id = p_event_id),
    'unique_viewers', (select count(distinct visitor_hash) from page_views where event_id = p_event_id),
    'views_7d',       (select count(*) from page_views
                        where event_id = p_event_id and occurred_at > now() - interval '7 days'),
    'guests',         (select coalesce(sum(headcount), 0) from guests where event_id = p_event_id),
    'rsvp_yes',       (select coalesce(sum(headcount), 0) from rsvps
                        where event_id = p_event_id and attending = 'yes'),
    'rsvp_no',        (select count(*) from rsvps where event_id = p_event_id and attending = 'no'),
    'rsvp_maybe',     (select count(*) from rsvps where event_id = p_event_id and attending = 'maybe'),
    'blessings',      (select count(*) from blessings where event_id = p_event_id),
    'badge_clicks',   (select count(*) from badge_clicks where event_id = p_event_id)
  );
$$;

/** Platform-wide badge performance, ranked — which invitations actually refer people. */
create or replace function admin_badge_stats(p_days int default 30)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'total',   (select count(*) from badge_clicks),
    'window',  (select count(*) from badge_clicks
                  where occurred_at > now() - (p_days || ' days')::interval),
    'uniques', (select count(distinct visitor_hash) from badge_clicks
                  where occurred_at > now() - (p_days || ' days')::interval),
    'top', coalesce((
      select jsonb_agg(t)
      from (
        select b.slug,
               coalesce(e.title, b.slug) as title,
               count(*) as clicks,
               count(distinct b.visitor_hash) as uniques
        from badge_clicks b
        left join events e on e.id = b.event_id
        where b.occurred_at > now() - (p_days || ' days')::interval
        group by b.slug, e.title
        order by count(*) desc
        limit 10
      ) t
    ), '[]'::jsonb)
  );
$$;

grant execute on function admin_badge_stats(int) to authenticated;
