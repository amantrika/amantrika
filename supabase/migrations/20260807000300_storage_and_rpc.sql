-- Storage buckets and the RPCs the app calls instead of raw table writes.

-- ---------------------------------------------------------------- storage

-- Public-read: invite photos are served to anonymous guests and benefit from the
-- CDN. Writes are restricted to the event's managers by the policies below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-assets', 'event-assets', true, 26214400,
  array['image/jpeg','image/png','image/webp','image/avif','image/gif','audio/mpeg','audio/mp4','video/mp4']
)
on conflict (id) do nothing;

-- Objects are keyed <event_id>/<uuid>.<ext>, so the first path segment is the tenant.
create or replace function storage_event_id(object_name text)
returns uuid
language plpgsql
immutable
as $$
begin
  return (storage.foldername(object_name))[1]::uuid;
exception when others then
  return null;
end;
$$;

create policy "public reads event assets" on storage.objects
  for select using (bucket_id = 'event-assets');

create policy "managers upload event assets" on storage.objects
  for insert with check (
    bucket_id = 'event-assets' and can_manage_event(storage_event_id(name))
  );

create policy "managers update event assets" on storage.objects
  for update using (
    bucket_id = 'event-assets' and can_manage_event(storage_event_id(name))
  );

create policy "managers delete event assets" on storage.objects
  for delete using (
    bucket_id = 'event-assets' and can_manage_event(storage_event_id(name))
  );

-- ---------------------------------------------------------------- analytics RPC

/**
 * Record one invite view. `security definer` so an anonymous guest can be counted
 * without granting the anon role a blanket insert on page_views.
 * visitor_hash should already be salted+hashed by the caller — we never see an IP.
 */
create or replace function record_page_view(
  p_slug text,
  p_visitor_hash text default null,
  p_referrer text default null,
  p_country text default null,
  p_city text default null,
  p_guest_token text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_guest_id uuid;
begin
  select id into v_event_id from events where slug = p_slug and status = 'published';
  if v_event_id is null then
    return; -- Unpublished or unknown slug: silently ignore rather than leak existence.
  end if;

  if p_guest_token is not null then
    select id into v_guest_id from guests
    where event_id = v_event_id and invite_token = p_guest_token;
  end if;

  insert into page_views (event_id, visitor_hash, guest_id, referrer, country, city)
  values (v_event_id, p_visitor_hash, v_guest_id, left(p_referrer, 500), p_country, p_city);
end;
$$;

grant execute on function record_page_view(text, text, text, text, text, text) to anon, authenticated;

/** Daily view counts for the dashboard sparkline, zero-filled across the range. */
create or replace function event_views_by_day(p_event_id uuid, p_days int default 14)
returns table (day date, views bigint, uniques bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with span as (
    select generate_series(
      (current_date - (p_days - 1))::date, current_date, '1 day'::interval
    )::date as day
  )
  select
    span.day,
    count(pv.id) as views,
    count(distinct pv.visitor_hash) as uniques
  from span
  left join page_views pv
    on pv.event_id = p_event_id
   and pv.occurred_at >= span.day
   and pv.occurred_at < span.day + 1
  group by span.day
  order by span.day;
$$;

/**
 * One-shot dashboard summary. `security invoker` keeps RLS in force, so a caller
 * only ever gets numbers for events they can already manage.
 */
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
    'blessings',      (select count(*) from blessings where event_id = p_event_id)
  );
$$;

/** Agent earnings roll-up, scoped by RLS to the calling agent. */
create or replace function agent_stats(p_agent_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'events_total',     (select count(*) from events where agent_id = p_agent_id),
    'events_published', (select count(*) from events where agent_id = p_agent_id and status = 'published'),
    'orders_paid',      (select count(*) from orders where agent_id = p_agent_id and status = 'paid'),
    'gross_inr',        (select coalesce(sum(amount_inr), 0) from orders
                          where agent_id = p_agent_id and status = 'paid'),
    'earned_inr',       (select coalesce(sum(amount_inr), 0) from commissions
                          where agent_id = p_agent_id and status <> 'void'),
    'unpaid_inr',       (select coalesce(sum(amount_inr), 0) from commissions
                          where agent_id = p_agent_id and status in ('accrued', 'payable'))
  );
$$;
