-- Admin control plane: who may be an admin, and how partner agents get approved.

-- ------------------------------------------------------------ admin allowlist

/**
 * Admin is granted by email allowlist, enforced in the database.
 *
 * A UI check alone would be worth very little: anyone who reached the database
 * with an authenticated session could otherwise flip their own role. The trigger
 * below makes `role = 'admin'` impossible for a non-allowlisted address no
 * matter which path the write comes from.
 */
create table admin_allowlist (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now()
);

insert into admin_allowlist (email, note)
values ('theamantrika@gmail.com', 'Founder account')
on conflict (email) do nothing;

alter table admin_allowlist enable row level security;

-- Readable by admins only, and writable by nobody through the API: changing who
-- can be an admin is a deliberate migration or SQL-editor action, not a click.
create policy "admins read allowlist" on admin_allowlist
  for select using (is_admin());

create or replace function enforce_admin_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'admin' then
    if new.email is null
       or not exists (select 1 from admin_allowlist a where lower(a.email) = lower(new.email))
    then
      raise exception 'Address % is not eligible for the admin role', coalesce(new.email, '(none)')
        using hint = 'Add it to admin_allowlist first.';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_enforce_admin_allowlist
  before insert or update of role, email on profiles
  for each row execute function enforce_admin_allowlist();

/**
 * Replaces the signup handler so an allowlisted address becomes an admin
 * automatically on first signup — otherwise the founder account would be
 * created as a host and there would be no admin able to promote it.
 */
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role user_role;
  referrer_id    uuid;
  is_allowlisted boolean;
begin
  begin
    requested_role := (new.raw_user_meta_data ->> 'role')::user_role;
  exception when others then
    requested_role := 'host';
  end;

  select exists (
    select 1 from admin_allowlist a where lower(a.email) = lower(new.email)
  ) into is_allowlisted;

  if is_allowlisted then
    requested_role := 'admin';
  elsif requested_role is null or requested_role = 'admin' then
    -- Admin is never self-assignable by asking for it at signup.
    requested_role := 'host';
  end if;

  select a.id into referrer_id
  from agents a
  where a.referral_code = upper(new.raw_user_meta_data ->> 'referral_code')
    and a.status = 'approved';

  insert into profiles (id, email, full_name, phone, role, referred_by)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'phone',
    requested_role,
    referrer_id
  );

  if requested_role = 'agent' then
    -- Pending: a partner cannot act until an admin approves them.
    insert into agents (id, agency_name, referral_code, status)
    values (
      new.id,
      new.raw_user_meta_data ->> 'agency_name',
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
      'pending'
    );
  end if;

  return new;
end;
$$;

-- --------------------------------------------------------- partner approvals

create type agent_status as enum ('pending', 'approved', 'rejected', 'suspended');

alter table agents
  add column status agent_status not null default 'pending',
  add column applied_at   timestamptz not null default now(),
  add column reviewed_at  timestamptz,
  add column reviewed_by  uuid references profiles(id) on delete set null,
  add column review_note  text,
  -- Free-text context from the applicant: portfolio, city, how they heard of us.
  add column application_note text;

-- Existing agents predate the approval flow; grandfather them in.
update agents set status = 'approved', reviewed_at = now() where is_active;

create index agents_status_idx on agents(status, applied_at desc);

/**
 * `is_active` is kept as the operational switch (an approved partner can still
 * be paused) and is now derived from status rather than set independently, so
 * the two can never disagree.
 */
create or replace function sync_agent_active()
returns trigger
language plpgsql
as $$
begin
  new.is_active := (new.status = 'approved');
  return new;
end;
$$;

create trigger agents_sync_active
  before insert or update of status on agents
  for each row execute function sync_agent_active();

update agents set status = status;  -- fire the trigger once for existing rows

-- Only an approved partner may attach themselves to an invitation as its agent.
drop policy if exists "create events" on events;
create policy "create events" on events
  for insert with check (
    owner_id = auth.uid()
    or (
      agent_id = auth.uid()
      and exists (select 1 from agents a where a.id = auth.uid() and a.status = 'approved')
    )
    or is_admin()
  );

create policy "admins review agents" on agents
  for update using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------- admin metrics

/**
 * One round trip for the admin overview. `security invoker` so RLS still
 * applies — a non-admin calling this gets zeros rather than the platform's
 * numbers.
 */
create or replace function admin_overview()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'profiles_total',      (select count(*) from profiles),
    'profiles_7d',         (select count(*) from profiles where created_at > now() - interval '7 days'),
    'hosts',               (select count(*) from profiles where role = 'host'),
    'agents_total',        (select count(*) from agents),
    'agents_pending',      (select count(*) from agents where status = 'pending'),
    'events_total',        (select count(*) from events where showcase_source_id is null),
    'events_published',    (select count(*) from events where status = 'published' and showcase_source_id is null),
    'events_draft',        (select count(*) from events where status = 'draft'),
    'events_7d',           (select count(*) from events where created_at > now() - interval '7 days' and showcase_source_id is null),
    'revenue_inr',         (select coalesce(sum(amount_inr), 0) from orders where status = 'paid'),
    'revenue_30d_inr',     (select coalesce(sum(amount_inr), 0) from orders
                              where status = 'paid' and paid_at > now() - interval '30 days'),
    'orders_paid',         (select count(*) from orders where status = 'paid'),
    'commission_owed_inr', (select coalesce(sum(amount_inr), 0) from commissions
                              where status in ('accrued', 'payable')),
    'showcase_live',       (select count(*) from events where is_showcased and showcase_source_id is not null),
    'showcase_eligible',   (select count(*) from events
                              where (permissions ->> 'showcase_consent') = 'true'
                                and showcase_source_id is null
                                and not is_showcased),
    'guests_total',        (select coalesce(sum(headcount), 0) from guests),
    'rsvps_total',         (select count(*) from rsvps),
    'views_total',         (select count(*) from page_views)
  );
$$;

/** Daily series for the admin charts, zero-filled so gaps read as zero not absent. */
create or replace function admin_daily_series(p_days int default 30)
returns table (day date, signups bigint, invites bigint, revenue_inr bigint, views bigint)
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
    (select count(*) from profiles p
      where p.created_at >= span.day and p.created_at < span.day + 1),
    (select count(*) from events e
      where e.created_at >= span.day and e.created_at < span.day + 1
        and e.showcase_source_id is null),
    (select coalesce(sum(o.amount_inr), 0) from orders o
      where o.status = 'paid' and o.paid_at >= span.day and o.paid_at < span.day + 1),
    (select count(*) from page_views v
      where v.occurred_at >= span.day and v.occurred_at < span.day + 1)
  from span
  order by span.day;
$$;

grant execute on function admin_overview() to authenticated;
grant execute on function admin_daily_series(int) to authenticated;
