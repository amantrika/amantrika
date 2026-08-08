-- Real payments: provider-agnostic orders, a webhook idempotency ledger, and
-- the removal of the client's ability to author its own order.
--
-- Until now `publishEvent()` inserted an order under the caller's own grants and
-- immediately marked it paid. Money never moved and the trust boundary was
-- inverted. From here the browser can no longer create or settle an order at
-- all: the checkout Server Action writes under the service role, and only a
-- signature-verified webhook flips an order to `paid`.

-- ---------------------------------------------------------------- plans

-- Maps a plan onto the provider's catalogue. Null for the free plan, which
-- never reaches a checkout, and for any plan not yet mirrored into Dodo.
alter table plans add column dodo_product_id text;

update plans set dodo_product_id = 'pdt_0Nkv1A6AcJOx2OMN8sDQ3' where code = 'classic';
update plans set dodo_product_id = 'pdt_0Nkv1ABfJPE4BqyQflbcT' where code = 'premium';

-- ---------------------------------------------------------------- orders

alter table orders
  add column provider_session_id text,
  add column provider_payment_id text,
  add column currency  text not null default 'INR',
  add column failure_reason text;

-- 'dummy' described a gateway that never existed. The provider interface names
-- its implementations 'mock' and 'dodo'.
alter table orders alter column provider set default 'mock';
update orders set provider = 'mock' where provider = 'dummy';

-- The idempotency key that matters: a provider payment id may settle exactly one
-- order, however many times the provider retries the webhook.
create unique index orders_provider_payment_idx
  on orders(provider, provider_payment_id)
  where provider_payment_id is not null;

create index orders_session_idx
  on orders(provider_session_id)
  where provider_session_id is not null;

-- ---------------------------------------------------------------- webhook ledger

-- Every verified webhook delivery, recorded before its effects are applied.
-- The primary key is the idempotency guarantee: a replayed delivery conflicts
-- and the handler returns 200 without touching anything.
create table payment_events (
  provider    text not null,
  event_id    text not null,
  event_type  text not null,
  order_id    uuid references orders(id) on delete set null,
  payload     jsonb not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

create index payment_events_order_idx on payment_events(order_id);

alter table payment_events enable row level security;

-- No one reads this but an admin. The webhook handler writes under the service
-- role, which bypasses RLS.
create policy "admins read payment events" on payment_events
  for select using (is_admin());

-- ---------------------------------------------------------------- trust boundary

-- Orders are now authored server-side only. Leaving this policy in place would
-- let a signed-in user POST an order at any amount they liked.
drop policy "create own orders" on orders;
