-- Row-level security.
--
-- Three actors: a `host` owns their events, an `agent` manages events they created
-- for clients, an `admin` sees everything. Published invites are world-readable
-- because guests are never signed in.
--
-- Helpers are `security definer` so a policy on `profiles` can read `profiles`
-- without recursing through its own policy.

create or replace function auth_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$;

/** True when the caller owns the event, is its managing agent, or is an admin. */
create or replace function can_manage_event(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from events e
    where e.id = target
      and (e.owner_id = auth.uid() or e.agent_id = auth.uid() or is_admin())
  );
$$;

/** True when the event is published — i.e. safe to expose to anonymous guests. */
create or replace function event_is_public(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from events e where e.id = target and e.status = 'published');
$$;

alter table profiles    enable row level security;
alter table agents      enable row level security;
alter table events      enable row level security;
alter table sub_events  enable row level security;
alter table guests      enable row level security;
alter table rsvps       enable row level security;
alter table blessings   enable row level security;
alter table assets      enable row level security;
alter table page_views  enable row level security;
alter table plans       enable row level security;
alter table orders      enable row level security;
alter table commissions enable row level security;

-- ---------------------------------------------------------------- profiles

create policy "read own profile" on profiles
  for select using (id = auth.uid() or is_admin());

-- An agent must be able to see the hosts they referred, to manage them.
create policy "agents read referred profiles" on profiles
  for select using (referred_by = auth.uid());

create policy "update own profile" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "admins write profiles" on profiles
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------- agents

create policy "read own agent record" on agents
  for select using (id = auth.uid() or is_admin());

create policy "update own agent record" on agents
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "admins manage agents" on agents
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------- events

create policy "public reads published events" on events
  for select using (status = 'published');

create policy "managers read own events" on events
  for select using (owner_id = auth.uid() or agent_id = auth.uid() or is_admin());

-- A host creates events for themselves; an agent creates them on a client's behalf.
create policy "create events" on events
  for insert with check (
    owner_id = auth.uid()
    or (agent_id = auth.uid() and auth_role() in ('agent', 'admin'))
    or is_admin()
  );

create policy "managers update events" on events
  for update using (can_manage_event(id)) with check (can_manage_event(id));

create policy "owners delete events" on events
  for delete using (owner_id = auth.uid() or is_admin());

-- ---------------------------------------------------------------- child content

create policy "public reads sub_events of published" on sub_events
  for select using (event_is_public(event_id));
create policy "managers manage sub_events" on sub_events
  for all using (can_manage_event(event_id)) with check (can_manage_event(event_id));

create policy "public reads assets of published" on assets
  for select using (event_is_public(event_id));
create policy "managers manage assets" on assets
  for all using (can_manage_event(event_id)) with check (can_manage_event(event_id));

create policy "public reads approved blessings" on blessings
  for select using (event_is_public(event_id) and is_approved);
create policy "guests leave blessings" on blessings
  for insert with check (event_is_public(event_id));
create policy "managers manage blessings" on blessings
  for all using (can_manage_event(event_id)) with check (can_manage_event(event_id));

-- Guest list is private: a guest never reads the roster, only the managers do.
create policy "managers manage guests" on guests
  for all using (can_manage_event(event_id)) with check (can_manage_event(event_id));

-- Anyone holding the invite link may respond; only managers may read responses.
create policy "guests submit rsvps" on rsvps
  for insert with check (event_is_public(event_id));
create policy "managers read rsvps" on rsvps
  for select using (can_manage_event(event_id));
create policy "managers manage rsvps" on rsvps
  for all using (can_manage_event(event_id)) with check (can_manage_event(event_id));

-- Views are written server-side with the service role; managers read their own.
create policy "managers read page_views" on page_views
  for select using (can_manage_event(event_id));

-- ---------------------------------------------------------------- billing

create policy "anyone reads active plans" on plans
  for select using (is_active or is_admin());
create policy "admins manage plans" on plans
  for all using (is_admin()) with check (is_admin());

create policy "read own orders" on orders
  for select using (buyer_id = auth.uid() or agent_id = auth.uid() or is_admin());
create policy "create own orders" on orders
  for insert with check (buyer_id = auth.uid() or is_admin());
create policy "admins manage orders" on orders
  for all using (is_admin()) with check (is_admin());

-- Commissions are written by the accrue_commission trigger, never by the agent.
create policy "agents read own commissions" on commissions
  for select using (agent_id = auth.uid() or is_admin());
create policy "admins manage commissions" on commissions
  for all using (is_admin()) with check (is_admin());
