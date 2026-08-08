-- `clean_demo_data()` has never worked.
--
-- progress.md documents `select clean_demo_data();` as the thing to run before
-- real customers arrive, and it fails with "permission denied for table users":
-- the function is `security invoker`, so deleting from `auth.users` runs as the
-- caller, and neither `service_role` over PostgREST nor an admin in the SQL
-- editor holds that grant. A runbook command that errors is worse than no
-- command, because it is only discovered at the moment it is needed.
--
-- `security definer` fixes it, which makes the grant the thing to be careful
-- about rather than the function body. Two mitigations, both deliberate:
--
--   1. The delete patterns are hardcoded and narrow. It can only ever remove
--      `demo-%` invitations, their showcase clones, and `%@example.com`
--      accounts. There is no parameter, so there is nothing to inject.
--   2. Execute is revoked from every PostgREST role and granted to nobody. It
--      is callable from the SQL editor as `postgres`, which is the only place a
--      destructive one-shot belongs.

create or replace function clean_demo_data()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  removed_events   int;
  removed_accounts int;
begin
  -- Clones first: they cascade from their source anyway, but being explicit
  -- keeps the intent readable.
  delete from events
   where showcase_source_id in (select id from events where slug like 'demo-%');

  delete from events where slug like 'demo-%';
  get diagnostics removed_events = row_count;

  -- Cascades to profiles, agents, and anything they own.
  delete from auth.users where email like '%@example.com';
  get diagnostics removed_accounts = row_count;

  raise notice 'clean_demo_data: removed % demo invitation(s) and % demo account(s)',
    removed_events, removed_accounts;
end;
$$;

comment on function clean_demo_data is
  'Destructive, one-shot, run by hand before real customers arrive. Removes only '
  'demo-%% invitations, their showcase clones, and %%@example.com accounts.';

-- A `security definer` function in `public` is callable by every PostgREST role
-- unless revoked. This one deletes accounts.
revoke execute on function clean_demo_data() from public, anon, authenticated, service_role;
