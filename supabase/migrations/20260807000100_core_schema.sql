-- Amantrika core schema.
-- Design note: the product is not wedding-only. `events` is the generic tenant
-- object; wedding-specific shape lives in `events.hosts` (jsonb) and `sub_events`,
-- so a birthday or a corporate launch uses the same tables with a different
-- event_type and a different theme.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums

create type user_role as enum ('host', 'agent', 'admin');
create type event_status as enum ('draft', 'published', 'archived');
create type rsvp_status as enum ('yes', 'no', 'maybe', 'pending');
create type order_status as enum ('pending', 'paid', 'failed', 'refunded');
create type commission_status as enum ('accrued', 'payable', 'paid', 'void');
create type asset_kind as enum ('photo', 'audio', 'video', 'logo', 'document');

create type event_type as enum (
  'wedding', 'engagement', 'reception', 'anniversary', 'birthday',
  'baby_shower', 'naming', 'housewarming', 'graduation', 'corporate', 'other'
);

-- ---------------------------------------------------------------- profiles

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  full_name    text,
  phone        text,
  role         user_role not null default 'host',
  -- The agent who brought this user in, if any. Drives commission attribution.
  referred_by  uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column profiles.referred_by is
  'Agent profile that onboarded this host. Set once at signup; drives commissions.';

-- Agent-specific fields, kept out of profiles so the common path stays narrow.
create table agents (
  id              uuid primary key references profiles(id) on delete cascade,
  agency_name     text,
  referral_code   text not null unique,
  commission_rate numeric(5,4) not null default 0.1500 check (commission_rate between 0 and 1),
  payout_upi      text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------- events

create table events (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  owner_id      uuid not null references profiles(id) on delete cascade,
  -- Agent who created/manages this event on the host's behalf.
  agent_id      uuid references profiles(id) on delete set null,
  event_type    event_type not null default 'wedding',
  status        event_status not null default 'draft',
  theme_id      text not null default 'royal-maroon',

  title         text not null,
  -- [{ name, family, role }] — two partners for a wedding, one celebrant for a
  -- birthday, N hosts for a corporate event. Keeps the schema event-agnostic.
  hosts         jsonb not null default '[]'::jsonb,
  hashtag       text,
  main_datetime timestamptz,
  timezone      text not null default 'Asia/Kolkata',
  city          text,
  cover_asset_id uuid,

  story         text,
  story_moments jsonb not null default '[]'::jsonb,
  hotels        jsonb not null default '[]'::jsonb,
  -- Feature switches (rsvp_enabled, blessings_enabled, music, password...).
  settings      jsonb not null default '{}'::jsonb,

  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 80)
);

create index events_owner_idx on events(owner_id);
create index events_agent_idx on events(agent_id) where agent_id is not null;
create index events_published_idx on events(status, published_at desc);

-- Ceremonies / sessions within an event (haldi, mehndi, nikah, keynote, ...).
create table sub_events (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  key         text not null,
  name        text not null,
  starts_at   timestamptz,
  time_label  text,
  venue       text,
  address     text,
  map_url     text,
  dress_code  text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (event_id, key)
);

create index sub_events_event_idx on sub_events(event_id, sort_order);

-- ---------------------------------------------------------------- guests & responses

create table guests (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  name          text not null,
  phone         text,
  email         text,
  side          text,
  guest_group   text,
  headcount     int not null default 1 check (headcount > 0),
  meal          text,
  invited_keys  text[] not null default '{}',
  status        rsvp_status not null default 'pending',
  -- Per-guest personalised link: /invite/<slug>?t=<token>. Hex, not base64 —
  -- base64 emits '+' and '/', which would need escaping in a query string.
  invite_token  text not null default encode(gen_random_bytes(9), 'hex'),
  created_at    timestamptz not null default now(),
  unique (event_id, invite_token)
);

create index guests_event_idx on guests(event_id);

create table rsvps (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  guest_id    uuid references guests(id) on delete set null,
  guest_name  text not null,
  attending   rsvp_status not null,
  headcount   int not null default 1 check (headcount >= 0),
  sub_event_keys text[] not null default '{}',
  meal        text,
  message     text,
  created_at  timestamptz not null default now()
);

create index rsvps_event_idx on rsvps(event_id, created_at desc);

create table blessings (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  name        text not null,
  message     text not null check (length(message) between 1 and 1000),
  is_approved boolean not null default true,
  created_at  timestamptz not null default now()
);

create index blessings_event_idx on blessings(event_id, created_at desc);

-- ---------------------------------------------------------------- assets

create table assets (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  uploaded_by  uuid references profiles(id) on delete set null,
  kind         asset_kind not null default 'photo',
  storage_path text not null unique,
  file_name    text,
  mime_type    text,
  size_bytes   bigint,
  width        int,
  height       int,
  caption      text,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create index assets_event_idx on assets(event_id, sort_order);

alter table events
  add constraint events_cover_asset_fk
  foreign key (cover_asset_id) references assets(id) on delete set null;

-- ---------------------------------------------------------------- analytics

create table page_views (
  id           bigserial primary key,
  event_id     uuid not null references events(id) on delete cascade,
  occurred_at  timestamptz not null default now(),
  -- Salted daily hash of IP+UA. Lets us count uniques without storing an identifier.
  visitor_hash text,
  guest_id     uuid references guests(id) on delete set null,
  referrer     text,
  country      text,
  city         text
);

create index page_views_event_time_idx on page_views(event_id, occurred_at desc);
create index page_views_unique_idx on page_views(event_id, visitor_hash);

-- ---------------------------------------------------------------- billing (dummy provider)

create table plans (
  code         text primary key,
  name         text not null,
  price_inr    int not null,
  description  text,
  features     jsonb not null default '[]'::jsonb,
  is_active    boolean not null default true,
  sort_order   int not null default 0
);

create table orders (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  buyer_id     uuid not null references profiles(id) on delete cascade,
  agent_id     uuid references profiles(id) on delete set null,
  plan_code    text not null references plans(code),
  amount_inr   int not null check (amount_inr >= 0),
  status       order_status not null default 'pending',
  -- 'dummy' today; swap for 'razorpay' without a schema change.
  provider     text not null default 'dummy',
  provider_ref text,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);

create index orders_event_idx on orders(event_id);
create index orders_agent_idx on orders(agent_id) where agent_id is not null;

create table commissions (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null unique references orders(id) on delete cascade,
  agent_id   uuid not null references profiles(id) on delete cascade,
  rate       numeric(5,4) not null,
  amount_inr int not null check (amount_inr >= 0),
  status     commission_status not null default 'accrued',
  created_at timestamptz not null default now(),
  paid_at    timestamptz
);

create index commissions_agent_idx on commissions(agent_id, status);

-- ---------------------------------------------------------------- triggers

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger events_updated_at before update on events
  for each row execute function set_updated_at();

-- Provision a profile whenever an auth user is created. Role and referral come
-- from signup metadata; anything unrecognised falls back to 'host'.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role user_role;
  referrer_id    uuid;
begin
  begin
    requested_role := (new.raw_user_meta_data ->> 'role')::user_role;
  exception when others then
    requested_role := 'host';
  end;

  -- Admin is never self-assignable at signup.
  if requested_role is null or requested_role = 'admin' then
    requested_role := 'host';
  end if;

  select a.id into referrer_id
  from agents a
  where a.referral_code = upper(new.raw_user_meta_data ->> 'referral_code')
    and a.is_active;

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
    insert into agents (id, agency_name, referral_code)
    values (
      new.id,
      new.raw_user_meta_data ->> 'agency_name',
      upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8))
    );
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Accrue an agent commission when an order is marked paid.
create or replace function accrue_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  agent_rate numeric(5,4);
  was_paid   boolean;
begin
  -- OLD is unassigned on INSERT, so it must never be dereferenced there.
  was_paid := tg_op = 'UPDATE' and old.status = 'paid';

  if new.status = 'paid' and not was_paid and new.agent_id is not null then
    select commission_rate into agent_rate from agents where id = new.agent_id;
    if agent_rate is not null then
      insert into commissions (order_id, agent_id, rate, amount_inr)
      values (new.id, new.agent_id, agent_rate, round(new.amount_inr * agent_rate))
      on conflict (order_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_accrue_commission
  after insert or update of status on orders
  for each row execute function accrue_commission();

-- ---------------------------------------------------------------- seed plans

insert into plans (code, name, price_inr, description, features, sort_order) values
  ('free',    'Sneak Peek', 0,    'Try the full builder, publish a watermarked invite.',
   '["1 event","Watermarked invite","Basic RSVP"]'::jsonb, 0),
  ('classic', 'Classic',    2999, 'Everything a single celebration needs.',
   '["1 event + 6 ceremonies","No watermark","RSVP + blessing wall","200 guest links","Analytics"]'::jsonb, 1),
  ('premium', 'Premium',    5999, 'For multi-day celebrations and big guest lists.',
   '["Unlimited ceremonies","Custom domain","Unlimited guests","Priority support","Music + video"]'::jsonb, 2);
