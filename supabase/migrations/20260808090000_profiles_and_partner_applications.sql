-- Member profiles, and applying to become a partner.
--
-- A host is not only a customer: they are the person whose wedding this is, and
-- some of them go on to make invitations for other people. These columns give
-- them somewhere to say who they are, and a route into the partner programme
-- without emailing anybody.

alter table profiles
  -- Stored bare ("amantrika"), never as a URL — so it can be rendered as a
  -- handle, linked, or shown as plain text without parsing it back apart.
  add column instagram text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  add column city text,
  add column bio text check (bio is null or length(bio) <= 400),
  -- What they are celebrating, in their own words. Free text on purpose: a
  -- dropdown of occasions already exists on the invitation itself, and this is
  -- for "our wedding, December, Jaipur" rather than for analysis.
  add column occasion_note text check (occasion_note is null or length(occasion_note) <= 200);

comment on column profiles.instagram is
  'Handle only, without the @ or any URL. Validated by the check constraint.';

/**
 * Applying to become a partner.
 *
 * Creates the `agents` row in `pending` — the same state a partner signup lands
 * in — so both routes converge on one review queue rather than two. The caller's
 * role is *not* changed here: they become an agent only when an admin approves,
 * which is what stops this being a self-service promotion.
 *
 * `security definer` because an applicant cannot be allowed to insert into
 * `agents` directly; the guard is this function's own logic.
 */
create or replace function apply_to_be_partner(
  p_agency_name text default null,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_existing agent_status;
  v_code     text;
begin
  if v_uid is null then
    raise exception 'You must be signed in to apply';
  end if;

  select status into v_existing from agents where id = v_uid;

  if v_existing is not null then
    -- Re-applying after a rejection is allowed; the rest are already answered.
    if v_existing = 'rejected' then
      update agents
         set status = 'pending',
             application_note = coalesce(p_note, application_note),
             agency_name = coalesce(nullif(trim(p_agency_name), ''), agency_name),
             applied_at = now(),
             reviewed_at = null,
             reviewed_by = null,
             review_note = null
       where id = v_uid;
      return 'pending';
    end if;
    return v_existing::text;
  end if;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into agents (id, agency_name, referral_code, status, application_note)
  values (v_uid, nullif(trim(p_agency_name), ''), v_code, 'pending', p_note);

  return 'pending';
end;
$$;

grant execute on function apply_to_be_partner(text, text) to authenticated;

/** The caller's own partner state, for rendering the right prompt. Null if never applied. */
create or replace function my_partner_status()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select case
    when a.id is null then null
    else jsonb_build_object(
      'status', a.status,
      'agency_name', a.agency_name,
      'referral_code', a.referral_code,
      'commission_rate', a.commission_rate,
      'review_note', a.review_note,
      'applied_at', a.applied_at
    )
  end
  from agents a
  where a.id = auth.uid();
$$;

grant execute on function my_partner_status() to authenticated;
