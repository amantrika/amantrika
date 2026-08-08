-- Fix: the status guard blocked the vote-count trigger, so no vote was ever
-- recorded.
--
-- `guard_feature_status` refused any non-admin update that changed `vote_count`.
-- But `vote_count` is written by `sync_feature_vote_count`, which fires after an
-- anonymous visitor inserts a vote — so every vote failed with "Only an
-- administrator may change a request's status", raised from inside the count
-- trigger rather than from anything the caller did.
--
-- Forbidding the column outright was the wrong shape. What actually needs
-- protecting is that the number is *true*, not that it never changes. The guard
-- now verifies the new value against a live count: the sync trigger's write
-- always matches and passes, while an arbitrary write ("my idea has 900 votes")
-- does not and is rejected.

create or replace function guard_feature_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() then
    return new;
  end if;

  -- Status and its public note stay admin-only.
  if new.status is distinct from old.status
     or new.status_note is distinct from old.status_note
     or new.decided_at is distinct from old.decided_at then
    raise exception 'Only an administrator may change a request''s status';
  end if;

  -- The count may move, but only to the truth.
  if new.vote_count is distinct from old.vote_count
     and new.vote_count <> (select count(*) from feature_votes v where v.request_id = new.id) then
    raise exception 'vote_count may only be set from the recorded votes';
  end if;

  return new;
end;
$$;
