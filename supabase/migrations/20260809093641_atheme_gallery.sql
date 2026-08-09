-- The Amantrika theme gallery: the five designs the product has been selling,
-- as photographs of real invitations rather than as renderable themes.
--
-- WHY THIS IS A SECOND TABLE AND NOT MORE ROWS IN `themes`.
--
-- `themes` is the rendering catalogue. Every row there has a matching typed
-- object in `src/themes/index.ts` with a section order, a hero variant, motifs
-- and a token block in globals.css, and `tests/unit/theme-catalogue.test.ts`
-- asserts the two agree — because the failure mode of drift is a theme a host
-- can choose and the guest page cannot draw. These five have none of that. They
-- are a name and a picture.
--
-- Putting them in `themes` would therefore either break that test or force
-- twelve fake registry entries. Putting them here says what they actually are:
-- a shop window. The window shows the photograph; `render_theme_id` decides
-- what gets built when someone buys.
--
-- That column is the whole point of the design. It is a real foreign key into
-- `themes`, so a gallery card can never send a host to an invitation that
-- cannot be rendered, and `events.theme_id` stays pointed at something the
-- registry knows. Selecting "Classic Elegance" sets the invitation's theme to
-- `cathedral-white` — the host sees the design they picked in the preview, and
-- the page has a renderer.
--
-- When one of these five eventually gets a real registry implementation, the
-- migration is to repoint `render_theme_id` at it. Nothing else changes.

create table atheme (
  -- The identifier from the legacy catalogue, kept verbatim so this table can
  -- be reconciled against the existing product without a mapping sheet.
  id            text primary key,
  name          text not null,
  -- Cloudinary delivery path, stored exactly as the legacy catalogue holds it
  -- (`/image/upload/v.../static-assets/x.png`). The cloud name is deployment
  -- configuration, not data, so it lives in NEXT_PUBLIC_CLOUDINARY_CLOUD and is
  -- joined on at render time — moving accounts is then an env change and not an
  -- UPDATE across every row.
  image_path    text not null,
  -- What actually gets built when this card is chosen. `restrict` on delete
  -- because a gallery card pointing at a theme that no longer exists is a
  -- checkout that dead-ends; withdraw the card with is_active instead.
  render_theme_id text not null references themes(id) on update cascade on delete restrict,
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

comment on table atheme is
  'Amantrika theme gallery: photographs of the five designs on sale. Display only — render_theme_id decides what is actually built.';
comment on column atheme.image_path is
  'Cloudinary path without the cloud name; joined with NEXT_PUBLIC_CLOUDINARY_CLOUD at render time.';
comment on column atheme.render_theme_id is
  'The themes(id) an invitation gets when this card is selected. Never a hardcoded id in app code.';

alter table atheme enable row level security;

-- Same shape as `themes` and `plans`: a public catalogue anyone may read while
-- it is offered, and only an admin may change.
create policy "anyone reads active atheme" on atheme
  for select using (is_active or is_admin());
create policy "admins manage atheme" on atheme
  for all using (is_admin()) with check (is_admin());

-- Imported from themes.csv. `sequence` there becomes sort_order, multiplied by
-- ten so a design can be slotted between two others without renumbering.
--
-- The render_theme_id mappings were chosen by looking at the five photographs
-- against the registry's layouts, not by matching names:
--
--   Timeless Charm   -> ivory-minimal    full-bleed photograph, warm neutral,
--                                        no ornament — minimal-type hero
--   Classic Elegance -> cathedral-white  sage botanical wreath, very restrained,
--                                        cathedral rhythm, ornament none
--   Modern Chic      -> coastal-lagoon   photograph-led opening — the registry's
--                                        other full-bleed-photo hero, airy
--   Eternal Grace    -> temple-south     script names first then countdown,
--                                        airy with light ornament — verse-first
--   Indian Touch     -> bandhani-blush   blush florals, elephants, Rajasthani
--                                        and playful — the closest by a distance
--
-- Three of the five map to premium themes. That is deliberate and it is
-- surfaced on the card, the same way the builder's picker badges them.
insert into atheme (id, name, image_path, render_theme_id, sort_order) values
  ('timeless-charm',   'Timeless Charm',   '/image/upload/v1761845407/static-assets/timeless-charm.png', 'ivory-minimal',   10),
  ('classic-elegance', 'Classic Elegance', '/image/upload/v1726597348/static-assets/theme-2.png',        'cathedral-white', 20),
  ('modern-chic',      'Modern Chic',      '/image/upload/v1722709079/static-assets/theme-1.jpg',        'coastal-lagoon',  30),
  ('eternal-grace',    'Eternal Grace',    '/image/upload/v1740313843/static-assets/eternal-grace.png',  'temple-south',    40),
  ('indian-touch',     'Indian Touch',     '/image/upload/v1740210247/static-assets/indian-touch.png',   'bandhani-blush',  50);

create index atheme_offered_idx on atheme (is_active, sort_order);
