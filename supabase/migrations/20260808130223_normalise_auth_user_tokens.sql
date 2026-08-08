-- Fixes "Database error loading user" and "Database error finding users count".
--
-- `supabase/seed-demo.sql` inserts rows straight into `auth.users` so that the
-- `handle_new_user` trigger fires the way a real signup would. That part is
-- sound, but it left GoTrue's token columns NULL, and GoTrue scans them into
-- non-nullable Go strings. One such row poisons the whole query:
--
--   auth.admin.listUsers()  -> "Database error finding users count"
--   auth.admin.deleteUser() -> "Database error loading user"
--
-- Both were live on this project. The second is what stopped `clean_demo_data()`
-- from removing the seeded accounts; the first was recorded in progress.md as
-- root cause unknown. Same cause.
--
-- The remedy is GoTrue's own convention: empty string, not NULL. Rows created by
-- GoTrue already look like this, so this only touches hand-inserted ones.
--
-- Recurrence is prevented in `supabase/seed-demo.sql`, which now writes '' for
-- these columns. A trigger on `auth.users` would be the stronger guard, but
-- Supabase denies `create function` in the `auth` schema to migrations, and
-- fighting the platform for a seed-file bug is the wrong trade.

update auth.users
   set confirmation_token     = coalesce(confirmation_token, ''),
       recovery_token         = coalesce(recovery_token, ''),
       email_change           = coalesce(email_change, ''),
       email_change_token_new = coalesce(email_change_token_new, ''),
       phone_change           = coalesce(phone_change, ''),
       phone_change_token     = coalesce(phone_change_token, '')
 where confirmation_token is null
    or recovery_token is null
    or email_change is null
    or email_change_token_new is null
    or phone_change is null
    or phone_change_token is null;
