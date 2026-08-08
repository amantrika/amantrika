-- Bookkeeping for the n8n automation layer (see n8n/README.md).
--
-- Design note: this lives in its own `automation` schema, not in `public`.
-- Three reasons. It never reaches PostgREST, so no anon or authenticated role
-- can see it even by accident. It stays out of src/lib/supabase/types.generated.ts,
-- so the app cannot accidentally take a dependency on operational state. And it
-- can be dropped wholesale if the side-car is ever retired, without touching a
-- single product table.
--
-- Nothing in the product reads from here. n8n is an operations layer: if it is
-- down, hosts stop being nudged and nothing else changes.

create schema if not exists automation;

comment on schema automation is
  'Operational state for the n8n side-car. Never read by the Next.js app.';

-- ------------------------------------------------------------- helpers

-- sha256() is core Postgres 11+. We deliberately avoid pgcrypto's digest():
-- on Supabase pgcrypto lives in the `extensions` schema and is not on the
-- search path here — the same reasoning as the core schema's note on
-- gen_random_bytes().
create function automation.hash_email(p_email text)
returns text
language sql
immutable
as $$
  select case
    when p_email is null or trim(p_email) = '' then null
    else encode(sha256(lower(trim(p_email))::bytea), 'hex')
  end;
$$;

comment on function automation.hash_email is
  'Stable identity for a recipient without storing the address. Used as the '
  'ledger key and as the opt-out key.';

-- Owner alerts travel over WhatsApp and email, both outside the authenticated
-- dashboard. Masking here means the raw address never leaves Postgres on that
-- path at all — the alert links to /admin for the full record.
create function automation.mask_email(p_email text)
returns text
language sql
immutable
as $$
  select case
    when p_email is null or position('@' in p_email) = 0 then null
    else left(split_part(p_email, '@', 1), 1)
      || repeat('*', greatest(length(split_part(p_email, '@', 1)) - 2, 1))
      || case
           when length(split_part(p_email, '@', 1)) > 1
             then right(split_part(p_email, '@', 1), 1)
           else ''
         end
      || '@' || split_part(p_email, '@', 2)
  end;
$$;

-- ------------------------------------------------------------- send ledger

-- The reason nobody is ever emailed twice.
--
-- Every workflow claims a row here *before* it sends, keyed on a deterministic
-- dedupe_key ('nudge:<event_id>:draft_72h'). The unique index is the entire
-- mechanism: a second run inserts, conflicts, gets no row back, and drops the
-- item. Two n8n instances racing the same schedule are safe for free.
create table automation.notifications (
  id           uuid primary key default gen_random_uuid(),
  -- Which workflow file produced this, e.g. '05-host-abandoned-draft-nudge'.
  workflow     text not null,
  -- The specific message within that workflow, e.g. 'draft_72h'.
  kind         text not null,
  subject_type text not null check (subject_type in ('profile','event','order','guest','agent','system')),
  subject_id   uuid,
  dedupe_key   text not null unique,
  channel      text not null check (channel in ('email','whatsapp','none')),
  -- SHA-256 of the lowercased recipient address. Never the address itself:
  -- CLAUDE.md rule 12 keeps guest and host PII out of operational tables.
  recipient_hash text,
  status       text not null default 'claimed'
                 check (status in ('claimed','sent','failed','skipped')),
  -- The fully rendered message. In DRY_RUN this is the only output, which is
  -- what makes a dry run a real proofreading pass rather than a smoke test.
  payload      jsonb not null default '{}'::jsonb,
  error        text,
  claimed_at   timestamptz not null default now(),
  sent_at      timestamptz
);

-- Finds rows stranded between claim and send — the runbook query.
create index notifications_stuck_idx
  on automation.notifications(status, claimed_at)
  where status = 'claimed';

create index notifications_subject_idx
  on automation.notifications(subject_type, subject_id, kind);

comment on column automation.notifications.dedupe_key is
  'Deterministic per message. Also passed to Resend as Idempotency-Key, so a '
  'retry between claim and send cannot produce a second delivery.';

-- ------------------------------------------------------------- opt-outs

-- Keyed by hash, so unsubscribing does not require storing the address.
create table automation.optouts (
  recipient_hash text not null,
  -- 'all' short-circuits every scope.
  scope          text not null default 'all'
                   check (scope in ('all','nudge','reminder','digest','marketing')),
  note           text,
  created_at     timestamptz not null default now(),
  primary key (recipient_hash, scope)
);

-- ------------------------------------------------------------- tunables

-- Cadence lives here rather than inside workflow JSON, so changing a threshold
-- is an UPDATE instead of a re-import.
create table automation.settings (
  key         text primary key,
  value       text not null,
  description text
);

insert into automation.settings (key, value, description) values
  ('rsvp_digest_threshold', '5',  'Minimum new RSVPs in 24h before a host gets a digest instead of silence.'),
  ('expiry_window_days',    '30', 'Days after the event date an invitation is treated as expired. Spec §14.'),
  ('archive_offer_days',    '25', 'Days after the event date the archive offer is sent. Spec §14.'),
  ('nudge_score_low',       '30', 'Completion score below which the 1h nudge fires.'),
  ('nudge_score_high',      '70', 'Completion score above which the 72h nudge fires.'),
  ('stuck_order_minutes',   '30', 'How long an order may sit pending before the sweeper looks at it.');

-- ------------------------------------------------------------- derived views

-- The spec (§14) wants a stored invites.expires_at set at publish time. That
-- column does not exist yet and adding it belongs to an app phase, not to the
-- automation layer. Deriving it costs one index scan and keeps this migration
-- additive.
--
-- Note there is no 'expired' value in event_status, so nothing flips a row into
-- it. This view drives warnings only.
create view automation.invite_expiry
with (security_invoker = true) as
select
  e.id            as event_id,
  e.slug,
  e.owner_id,
  e.plan_code,
  e.title,
  e.main_datetime,
  e.main_datetime + (
    (select value from automation.settings where key = 'expiry_window_days')::int
    * interval '1 day'
  ) as expires_at,
  e.main_datetime + (
    (select value from automation.settings where key = 'archive_offer_days')::int
    * interval '1 day'
  ) as archive_offer_at
from events e
where e.status = 'published'
  and e.main_datetime is not null;

-- Stand-in for the spec's stored completion_score (§15). Weighted by what a host
-- actually has to decide rather than by field count: a cover photo and a date are
-- real commitment, a hashtag is not.
create view automation.stale_drafts
with (security_invoker = true) as
select
  e.id        as event_id,
  e.slug,
  e.owner_id,
  e.title,
  e.theme_id,
  e.event_type,
  e.main_datetime,
  e.updated_at,
  e.created_at,
  extract(epoch from (now() - e.updated_at)) / 3600 as hours_idle,
    (case when coalesce(nullif(trim(e.title), ''), '') <> '' then 15 else 0 end)
  + (case when jsonb_array_length(e.hosts) >= 1              then 20 else 0 end)
  + (case when e.main_datetime is not null                   then 20 else 0 end)
  + (case when e.city is not null                            then 10 else 0 end)
  + (case when e.cover_asset_id is not null                  then 15 else 0 end)
  + (case when length(coalesce(e.story, '')) > 40            then 10 else 0 end)
  + (case when exists (select 1 from sub_events s where s.event_id = e.id) then 10 else 0 end)
    as completion_score,
  -- The single most useful thing to put in a nudge: what to do next.
  case
    when jsonb_array_length(e.hosts) = 0    then 'the names of the hosts'
    when e.main_datetime is null            then 'the date and time'
    when not exists (select 1 from sub_events s where s.event_id = e.id)
                                            then 'your first ceremony'
    when e.city is null                     then 'the city'
    when e.cover_asset_id is null           then 'a cover photo'
    when length(coalesce(e.story, '')) <= 40 then 'your story'
    else 'a final look before publishing'
  end as next_step
from events e
where e.status = 'draft';

-- Supports the nudge sweep, which scans drafts by idle time.
create index events_draft_idle_idx on events(status, updated_at) where status = 'draft';
-- Supports the expiry, reminder and wrap-up sweeps, all of which window on the
-- event date within published rows.
create index events_published_date_idx on events(status, main_datetime) where status = 'published';

-- ------------------------------------------------------------- grants

-- Anon and authenticated get nothing here, ever. n8n connects as a Postgres
-- superuser over the pooler and does not go through PostgREST, so no grant to
-- service_role is needed for it to work — but being explicit means a future
-- `grant usage on schema automation to authenticated` has to be deliberate.
revoke all on schema automation from public;
revoke all on all tables in schema automation from public;

alter table automation.notifications enable row level security;
alter table automation.optouts       enable row level security;
alter table automation.settings      enable row level security;

-- No policies, deliberately. RLS with zero policies denies every non-superuser
-- role, which is exactly the intended posture: this schema has one client.
