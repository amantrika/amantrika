-- Workflow 03 — partner application alert. Runs every 15 minutes.
--
-- Fires once per application. It deliberately does not re-nag: if you leave an
-- application pending for a week that is a decision, and the daily digest
-- already carries the standing `partners_pending` count.
--
-- Approve/reject happens at /admin/partners. Inline buttons would need an
-- HTTP endpoint in the app that can act as an admin, which is exactly the kind
-- of privileged surface this side-car is designed not to create.

select
  a.id::text                     as agent_id,
  coalesce(nullif(trim(p.full_name), ''), 'Unnamed applicant') as applicant,
  automation.mask_email(p.email) as email_masked,
  a.agency_name,
  a.referral_code,
  a.application_note,
  round(a.commission_rate * 100, 2)::text || '%' as commission_rate,
  to_char(a.applied_at at time zone 'Asia/Kolkata', 'DD Mon, HH24:MI') as applied_ist,
  -- Context for the decision: has this person already built anything?
  (select count(*) from events e where e.owner_id = a.id) as events_built,
  'partner_pending:' || a.id::text as dedupe_key
from agents a
join profiles p on p.id = a.id
left join automation.notifications n
  on n.dedupe_key = 'partner_pending:' || a.id::text
where a.status = 'pending'
  and a.applied_at > now() - interval '30 days'
  and n.id is null
order by a.applied_at asc
limit 25;
