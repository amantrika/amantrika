-- What an invitation is entitled to, recorded on the invitation itself.
--
-- The alternative was deriving entitlements from the paid order at render time.
-- That fails twice: guests have no grant to read `orders`, so the guest path
-- would need the service role; and it costs a second query on `/invite/[slug]`,
-- which is the one route with a hard latency budget.
--
-- The webhook writes this column when it settles a payment. Nothing else may.

alter table events
  add column plan_code text not null default 'free' references plans(code);

-- Anything already paid for keeps what it bought.
update events e
   set plan_code = o.plan_code
  from orders o
 where o.event_id = e.id
   and o.status = 'paid';

-- The bundled showcase invitations are marketing surfaces, not customer work.
-- They were published before there was anything to buy, and a watermark on the
-- examples we advertise with would be self-defeating.
update events
   set plan_code = 'premium'
 where slug like 'demo-%'
   and plan_code = 'free';

comment on column events.plan_code is
  'Set by the payment webhook on settlement. Drives src/lib/entitlements.ts.';
