-- Workflow 01 — new signup alert. Runs every 10 minutes.
--
-- The 24h window is a safety net, not the dedupe mechanism: the LEFT JOIN on
-- the ledger is what stops a repeat. The window only bounds the scan, and means
-- an n8n outage shorter than a day self-heals on the next run.
--
-- Note this alert path never sees a raw address. automation.mask_email() does
-- the redaction inside Postgres, and the full record stays behind /admin auth.

select
  p.id::text                                as profile_id,
  coalesce(nullif(trim(p.full_name), ''), 'Someone') as full_name,
  automation.mask_email(p.email)            as email_masked,
  p.role::text                              as role,
  p.phone is not null                       as has_phone,
  to_char(p.created_at at time zone 'Asia/Kolkata', 'DD Mon, HH24:MI') as signed_up_ist,
  a.agency_name,
  a.referral_code,
  ref.full_name                             as referred_by_name,
  -- Distinguishes "an agent applied" from "a host signed up via an agent link".
  case
    when p.role = 'agent'       then 'partner application'
    when p.referred_by is not null then 'referred by a partner'
    else 'direct'
  end                                       as source,
  'signup:' || p.id::text                   as dedupe_key
from profiles p
left join agents   a   on a.id   = p.id
left join profiles ref on ref.id = p.referred_by
left join automation.notifications n on n.dedupe_key = 'signup:' || p.id::text
where p.created_at > now() - interval '24 hours'
  and n.id is null
order by p.created_at asc
limit 50;
