-- Public showcase gallery.
--
-- Design follows project-overview.md §2.12 and §10.1: consent is explicit and
-- default-off, it only makes an invitation *eligible*, an admin still curates,
-- and what gets published is a **sanitised clone** — never the family's live
-- invitation. Publishing someone's venue address, phone numbers and payment
-- details to a marketing page is a privacy violation, not a growth hack.

-- ---------------------------------------------------------------- events

alter table events
  -- Curation flag. Only an admin may set this; consent alone is not enough.
  add column is_showcased boolean not null default false,
  add column showcase_tags text[] not null default '{}',
  -- Host consent flags, kept separate from `settings` (which is feature
  -- switches) because consent has different semantics: it is withdrawable, it
  -- is audited, and it must never be changed on the host's behalf.
  add column permissions jsonb not null default '{}'::jsonb,
  -- On a clone, points back at the invitation it was derived from. Null on
  -- originals. Cascade so withdrawing an invitation takes its clone with it.
  add column showcase_source_id uuid references events(id) on delete cascade,
  add column showcased_at timestamptz;

comment on column events.showcase_source_id is
  'Set on sanitised clones only. The public gallery links here, never to the source.';

-- Partial indexes: the gallery reads only clones, curation reads only eligible
-- originals, and both are a small slice of the table.
create index events_showcase_idx
  on events(showcased_at desc)
  where is_showcased and showcase_source_id is not null;

create index events_showcase_source_idx
  on events(showcase_source_id)
  where showcase_source_id is not null;

create index events_showcase_eligible_idx
  on events(created_at desc)
  where (permissions ->> 'showcase_consent') = 'true' and showcase_source_id is null;

-- ------------------------------------------------------- consent audit trail

/**
 * Every grant and withdrawal, with the exact wording shown at the time.
 * Append-only: consent history is evidence, so nothing here is ever updated or
 * deleted, and there is intentionally no UPDATE or DELETE policy below.
 */
create table showcase_consents (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  profile_id   uuid references profiles(id) on delete set null,
  granted      boolean not null,
  anonymise    boolean not null default true,
  -- The literal sentence the host agreed to. If the copy changes later, old
  -- rows still record what was actually promised.
  consent_text text not null,
  ip_address   inet,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index showcase_consents_event_idx on showcase_consents(event_id, created_at desc);

-- ---------------------------------------------------------------- RLS

alter table showcase_consents enable row level security;

create policy "managers read consent history" on showcase_consents
  for select using (can_manage_event(event_id));

create policy "managers record consent" on showcase_consents
  for insert with check (can_manage_event(event_id));

-- Anonymous visitors may read curated clones. This is additive to the existing
-- "public reads published events" policy: a clone is `archived`, so it is not
-- reachable at its own /invite/ URL by the normal published-events rule.
create policy "public reads showcased clones" on events
  for select using (is_showcased and showcase_source_id is not null);

create policy "public reads showcased sub_events" on sub_events
  for select using (
    exists (
      select 1 from events e
      where e.id = sub_events.event_id
        and e.is_showcased
        and e.showcase_source_id is not null
    )
  );

create policy "public reads showcased assets" on assets
  for select using (
    exists (
      select 1 from events e
      where e.id = assets.event_id
        and e.is_showcased
        and e.showcase_source_id is not null
    )
  );

-- ------------------------------------------------- sanitising clone generator

/**
 * Builds (or refreshes) the sanitised clone of an eligible invitation and
 * returns the clone's id.
 *
 * `security definer` because curation is an admin action that has to read the
 * source invitation and write a new row; the guard below is the authorisation,
 * not RLS.
 *
 * What is stripped, per §2.12:
 *   - venue address reduced to city only
 *   - every phone number removed (hotels, contacts)
 *   - gift/registry and UPI details removed
 *   - guests, RSVPs and blessings are simply never copied
 *   - hashtag dropped (it is a searchable handle back to the real family)
 *   - if `showcase_anonymise`, host surnames and family names are dropped too
 */
create or replace function generate_showcase_clone(p_source_id uuid, p_tags text[] default '{}')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  src            events%rowtype;
  clone_id       uuid;
  anonymise      boolean;
  clone_slug     text;
  clean_hosts    jsonb;
begin
  if not is_admin() then
    raise exception 'Only an administrator may curate the showcase';
  end if;

  select * into src from events where id = p_source_id;
  if src.id is null then
    raise exception 'Unknown invitation %', p_source_id;
  end if;

  -- Consent is a hard gate, checked here rather than trusted from the caller.
  if coalesce((src.permissions ->> 'showcase_consent')::boolean, false) is not true then
    raise exception 'Invitation % has not consented to being showcased', p_source_id;
  end if;

  anonymise := coalesce((src.permissions ->> 'showcase_anonymise')::boolean, true);

  -- First names only when anonymising; drop family names either way, since a
  -- household name plus a city identifies people quite precisely.
  select jsonb_agg(
           case
             when anonymise then jsonb_build_object('name', split_part(h ->> 'name', ' ', 1))
             else jsonb_build_object('name', h ->> 'name')
           end
         )
    into clean_hosts
    from jsonb_array_elements(coalesce(src.hosts, '[]'::jsonb)) as h;

  select id into clone_id from events where showcase_source_id = p_source_id;

  if clone_id is null then
    clone_slug := 'showcase-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

    insert into events (
      slug, owner_id, agent_id, event_type, status, theme_id, title, hosts,
      hashtag, main_datetime, timezone, city, story, story_moments, hotels,
      settings, permissions, is_showcased, showcase_tags, showcase_source_id,
      showcased_at
    )
    values (
      clone_slug, src.owner_id, null, src.event_type,
      -- Archived so the clone can never be served by the published-events rule;
      -- it is reachable only through the showcase policy above.
      'archived',
      src.theme_id,
      case when anonymise then 'A ' || src.event_type::text || ' invitation' else src.title end,
      coalesce(clean_hosts, '[]'::jsonb),
      null,                                   -- hashtag: links back to real people
      src.main_datetime, src.timezone, src.city, src.story, src.story_moments,
      '[]'::jsonb,                            -- hotels carry phone numbers
      -- Interactive features off: a sample must not collect anyone's data.
      jsonb_build_object('rsvpEnabled', false, 'blessingsEnabled', false,
                         'showCountdown', false),
      '{}'::jsonb,
      true, p_tags, p_source_id, now()
    )
    returning id into clone_id;
  else
    update events set
      theme_id       = src.theme_id,
      hosts          = coalesce(clean_hosts, '[]'::jsonb),
      story          = src.story,
      story_moments  = src.story_moments,
      city           = src.city,
      main_datetime  = src.main_datetime,
      is_showcased   = true,
      showcase_tags  = p_tags,
      showcased_at   = now()
    where id = clone_id;

    delete from sub_events where event_id = clone_id;
    delete from assets where event_id = clone_id;
  end if;

  -- Ceremonies: keep the shape of the day, drop anything locating or contactable.
  insert into sub_events (event_id, key, name, starts_at, time_label, venue,
                          address, map_url, dress_code, sort_order)
  select clone_id, key, name, starts_at, time_label,
         venue,
         src.city,          -- address reduced to the city
         null,              -- no map pin
         dress_code, sort_order
  from sub_events where event_id = p_source_id;

  -- Photos are the point of a gallery, so they are copied as-is. The host
  -- consented to exactly this, and they own the images.
  insert into assets (event_id, uploaded_by, kind, storage_path, file_name,
                      mime_type, size_bytes, width, height, caption, sort_order)
  select clone_id, null, kind, storage_path, null, mime_type, size_bytes,
         width, height, caption, sort_order
  from assets where event_id = p_source_id and kind = 'photo';

  update events set is_showcased = true where id = p_source_id;

  return clone_id;
end;
$$;

/**
 * Withdraws an invitation from the gallery. Callable by the host (it is their
 * consent to withdraw) as well as an admin, hence the `can_manage_event` check
 * rather than an admin-only one.
 */
create or replace function withdraw_showcase(p_source_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not can_manage_event(p_source_id) then
    raise exception 'Not allowed to withdraw invitation %', p_source_id;
  end if;

  -- Deleting the clone outright, rather than hiding it: withdrawal should leave
  -- nothing behind to leak later.
  delete from events where showcase_source_id = p_source_id;

  update events
     set is_showcased = false,
         permissions = permissions || jsonb_build_object('showcase_consent', false)
   where id = p_source_id;
end;
$$;

grant execute on function withdraw_showcase(uuid) to authenticated;
grant execute on function generate_showcase_clone(uuid, text[]) to authenticated;
