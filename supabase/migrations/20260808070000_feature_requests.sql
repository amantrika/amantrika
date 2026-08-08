-- Public feature requests and voting.
--
-- Two different bars on purpose, per the product decision:
--   * voting is anonymous, one per person per request, deduped by a hashed IP —
--     low friction, because the point is a signal not a ballot;
--   * *proposing* an idea requires an account, because an unauthenticated
--     submit box on a public page is a spam target and because a proposal is
--     something we may need to reply to.

create type feature_status as enum (
  'open',       -- collecting votes
  'planned',    -- accepted; voting closes
  'building',   -- in progress
  'shipped',
  'declined'
);

create table feature_requests (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid references profiles(id) on delete set null,
  title       text not null check (length(trim(title)) between 4 and 120),
  body        text check (length(body) <= 2000),
  status      feature_status not null default 'open',
  -- Set by an admin when the status changes, shown publicly next to the item.
  status_note text,
  -- Denormalised so the list can sort by popularity without a join per row.
  vote_count  int not null default 0,
  /**
   * Once an admin has decided, the item stops collecting votes — continuing to
   * gather signal on something already planned or declined is noise, and it
   * lets the roadmap show a settled decision rather than a live contest.
   */
  decided_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index feature_requests_rank_idx on feature_requests(status, vote_count desc, created_at desc);
create index feature_requests_author_idx on feature_requests(author_id);

/**
 * One row per voter per request.
 *
 * `voter_hash` is a salted SHA-256 of the IP that does **not** rotate daily,
 * unlike the hash used for view counting. A rotating hash would let the same
 * person vote again every day, which defeats the purpose. It is still one-way
 * and carries no address, so it identifies a vote as "already cast" without
 * identifying a person.
 *
 * `profile_id` is recorded when the voter happens to be signed in, so the
 * contributor leaderboard can credit them. It is not required to vote.
 */
create table feature_votes (
  id         bigserial primary key,
  request_id uuid not null references feature_requests(id) on delete cascade,
  voter_hash text not null,
  profile_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (request_id, voter_hash)
);

create index feature_votes_profile_idx on feature_votes(profile_id) where profile_id is not null;

create trigger feature_requests_updated_at before update on feature_requests
  for each row execute function set_updated_at();

/** Keeps `vote_count` honest without the app ever writing it. */
create or replace function sync_feature_vote_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update feature_requests f
     set vote_count = (select count(*) from feature_votes v where v.request_id = f.id)
   where f.id = coalesce(new.request_id, old.request_id);
  return null;
end;
$$;

create trigger feature_votes_sync
  after insert or delete on feature_votes
  for each row execute function sync_feature_vote_count();

-- ---------------------------------------------------------------- RLS

alter table feature_requests enable row level security;
alter table feature_votes enable row level security;

-- The board is public: anyone can read it, signed in or not.
create policy "anyone reads requests" on feature_requests
  for select using (true);

-- Proposing requires an account, and you may only post as yourself.
create policy "signed-in members propose" on feature_requests
  for insert with check (auth.uid() is not null and author_id = auth.uid());

-- An author may correct their own wording, but never the status or the count —
-- those are enforced by the trigger below rather than by column grants.
create policy "authors edit their own" on feature_requests
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "admins manage requests" on feature_requests
  for all using (is_admin()) with check (is_admin());

/** Stops an author quietly promoting their own idea to "planned". */
create or replace function guard_feature_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    if new.status is distinct from old.status
       or new.status_note is distinct from old.status_note
       or new.vote_count is distinct from old.vote_count then
      raise exception 'Only an administrator may change a request''s status';
    end if;
  end if;
  return new;
end;
$$;

create trigger feature_requests_guard_status
  before update on feature_requests
  for each row execute function guard_feature_status();

-- Votes are counted in aggregate and never listed publicly.
create policy "admins read votes" on feature_votes
  for select using (is_admin());

-- ---------------------------------------------------------------- RPCs

/**
 * Casts a vote. Returns the request's new total, or -1 if voting is closed.
 *
 * `security definer` so an anonymous visitor can vote without the anon role
 * holding a blanket insert. Idempotent: voting twice from the same hash is a
 * no-op rather than an error, because a double-tap should not look like a
 * failure to the person who tapped.
 */
create or replace function cast_feature_vote(
  p_request_id uuid,
  p_voter_hash text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status feature_status;
  v_count  int;
begin
  select status into v_status from feature_requests where id = p_request_id;
  if v_status is null then
    return -1;
  end if;

  -- Voting closes once a decision is made.
  if v_status <> 'open' then
    return -1;
  end if;

  insert into feature_votes (request_id, voter_hash, profile_id)
  values (p_request_id, p_voter_hash, auth.uid())
  on conflict (request_id, voter_hash) do nothing;

  select vote_count into v_count from feature_requests where id = p_request_id;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function cast_feature_vote(uuid, text) to anon, authenticated;

/** Which of these requests the caller has already voted on, so the UI can show it. */
create or replace function my_feature_votes(p_voter_hash text)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select request_id from feature_votes where voter_hash = p_voter_hash;
$$;

grant execute on function my_feature_votes(text) to anon, authenticated;

/**
 * Contributor leaderboard: who proposes ideas people actually want.
 *
 * Ranked by votes received rather than requests submitted, so posting twenty
 * ideas nobody votes for does not outrank one good one. Only a display name is
 * exposed — never an email.
 */
create or replace function feature_leaderboard(p_limit int default 20)
returns table (
  profile_id uuid,
  name text,
  requests bigint,
  votes_received bigint,
  votes_cast bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id,
    coalesce(nullif(trim(p.full_name), ''), 'A member') as name,
    (select count(*) from feature_requests r where r.author_id = p.id),
    (select coalesce(sum(r.vote_count), 0) from feature_requests r where r.author_id = p.id),
    (select count(*) from feature_votes v where v.profile_id = p.id)
  from profiles p
  where exists (select 1 from feature_requests r where r.author_id = p.id)
     or exists (select 1 from feature_votes v where v.profile_id = p.id)
  order by 4 desc, 3 desc
  limit p_limit;
$$;

grant execute on function feature_leaderboard(int) to anon, authenticated;
