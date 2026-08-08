-- Themes as a catalogue row, so which themes exist, what they cost and what
-- order they appear in stop being a deploy.
--
-- WHAT IS AND IS NOT HERE, because this split is the whole design:
--
-- The table holds the *catalogue* — identity, tags, palette, tier, whether it
-- is offered, where it sorts. It does not hold the theme's behaviour. Section
-- order, hero variant, motif set, border style, opening animation and the rest
-- live in `src/themes/index.ts` as typed objects with React components in them,
-- and none of that survives a round trip through jsonb. Putting the layout here
-- would also cost the two things that currently keep it honest: it is
-- typechecked, and `tests/e2e/theme-layout.spec.ts` asserts every theme against
-- the registry. A malformed section order in a database row would reach a
-- guest's invitation at request time instead of failing a build.
--
-- So: the registry stays the rendering contract, and this table is the shop
-- window. `tests/unit/theme-catalogue.test.ts` asserts the two agree, because
-- the failure mode of drift is a theme that can be chosen and cannot be drawn.
--
-- Tier gates *selection*, never features. What an invitation can do is decided
-- by its plan, in `src/lib/invites/entitlements.ts`, and nothing else — a paying
-- customer who prefers a free theme keeps every feature they paid for.

create type theme_tier as enum ('free', 'premium');

create table themes (
  id            text primary key,
  name          text not null,
  tier          theme_tier not null default 'premium',
  -- Tags mirror the registry's and exist so the picker can filter without
  -- shipping the whole registry to the browser.
  religion_tag  text not null,
  region_tag    text not null default '',
  mood_tag      text not null,
  -- Preview swatches only. The real styling is the [data-theme] block in
  -- globals.css; this is what a card shows before anything is rendered.
  palette       text[] not null default '{}',
  description   text,
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

comment on table themes is
  'Theme catalogue: identity, tier and ordering. Behaviour lives in src/themes/index.ts.';
comment on column themes.tier is
  'Gates which themes a plan may choose. Never gates features — see entitlements.ts.';

alter table themes enable row level security;

-- Same shape as `plans`: a public catalogue anyone may read while it is offered,
-- and only an admin may change. Withdrawing a theme hides it from the picker
-- without breaking invitations that already use it, which is why is_active is a
-- flag and not a delete.
create policy "anyone reads active themes" on themes
  for select using (is_active or is_admin());
create policy "admins manage themes" on themes
  for all using (is_admin()) with check (is_admin());

-- Seeded from src/themes/index.ts as of this migration.
--
-- The free set is one theme per faith plus the interfaith default, so no family
-- is pushed to pay by their religion — that would be an ugly way to charge.
-- Premium is the ornate variety. This is a product judgement and it is a row:
-- change a tier in the dashboard, no deploy needed.
insert into themes (id, name, tier, religion_tag, region_tag, mood_tag, palette, sort_order) values
  ('royal-maroon',    'Royal Maroon',    'free',    'hindu',      'India',                       'royal',   array['#6B1F2A','#C9A227','#FBF6EC','#8C4A2F'],  10),
  ('nikah-emerald',   'Nikah Emerald',   'free',    'muslim',     'Pakistan · Middle East',      'royal',   array['#146B4A','#C9A227','#F2F8F2','#11332A'],  20),
  ('anand-karaj',     'Anand Karaj',     'free',    'sikh',       'India · Punjab',              'royal',   array['#D97700','#1C2A4A','#FFF7E9','#C9A227'],  30),
  ('cathedral-white', 'Cathedral White', 'free',    'christian',  'International',               'minimal', array['#6E7F6B','#C2AB72','#FDFDFB','#3A4038'],  40),
  ('ivory-minimal',   'Ivory Minimal',   'free',    'interfaith', 'International',               'minimal', array['#1F1F1D','#A8926B','#FAFAF7','#6B6B63'],  50),
  ('haldi-sunshine',  'Haldi Sunshine',  'premium', 'hindu',      'India',                       'playful', array['#D99000','#E4611C','#FFF6DF','#4A2E0C'],  60),
  ('peacock-raas',    'Peacock Raas',    'premium', 'hindu',      'India',                       'festive', array['#14595B','#D63A6A','#EDF8F6','#C9A227'],  70),
  ('temple-south',    'Temple South',    'premium', 'hindu',      'India',                       'minimal', array['#1E5631','#C9A227','#FBF6EC','#22301F'],  80),
  ('mehndi-nights',   'Mehndi Nights',   'premium', 'muslim',     'Pakistan',                    'festive', array['#B565D8','#CFCFDC','#2A1533','#F5ECF8'],  90),
  ('bandhani-blush',  'Bandhani Blush',  'premium', 'hindu',      'India · Rajasthan',           'playful', array['#C2185B','#F7C948','#FFF1F4','#4A1229'], 100),
  ('banarasi-gold',   'Banarasi Gold',   'premium', 'hindu',      'India · Banaras',             'royal',   array['#7B1E3A','#C9A227','#FFF8EA','#3A1020'], 110),
  ('coastal-lagoon',  'Coastal Lagoon',  'premium', 'interfaith', 'Goa · Kerala · destination',  'minimal', array['#0E7C86','#E8B25F','#F4FBFB','#123338'], 120);

-- Any invitation pointing at a theme this catalogue does not know goes to the
-- default rather than blocking the constraint. Done before the foreign key so
-- adding it cannot fail on a row nobody remembers creating.
update events
   set theme_id = 'royal-maroon'
 where theme_id not in (select id from themes);

-- `on update cascade` so renaming a theme id stays possible; `restrict` on
-- delete because deleting a theme out from under a published invitation would
-- break a page that is already on hundreds of WhatsApp messages. Withdraw a
-- theme with is_active instead.
alter table events
  add constraint events_theme_id_fkey
  foreign key (theme_id) references themes(id)
  on update cascade on delete restrict;

create index themes_offered_idx on themes (is_active, sort_order);
