# Amantrika 💌

Digital invitations that open like a real card — wax seal, envelope, petals and all.
Weddings first, but the data model is generic: engagements, birthdays, housewarmings
and corporate events all use the same tables with a different `event_type`.

**Stack:** Next.js 15 (App Router) · Supabase (Postgres, Auth, Storage) · Tailwind 4 ·
Framer Motion · TypeScript. Deployment and Supabase setup: see [`DEPLOY.md`](./DEPLOY.md).

## Quick start

```bash
npm install
cp .env.example .env.local     # fill in your Supabase keys — see DEPLOY.md
npm run dev                    # http://localhost:3000
```

| Where to go | What you'll see |
| --- | --- |
| `/` | Marketing landing page |
| `/design-system` | **The living design system** (start here) |
| `/signup` · `/login` | Accounts — host or partner agent |
| `/onboarding` | Create-your-invitation flow (7 steps, writes to Supabase) |
| `/dashboard` | Your celebrations; `/dashboard/[id]` for analytics, guests, photos, settings |
| `/agent` | Partner dashboard: clients, referral code, commission ledger |
| `/admin` | Platform-wide view (requires `role = 'admin'`) |
| `/invite/swarnil-weds-prachi` | Live invitation — tap the wax seal! |

## Roles

| Role | Can do |
| --- | --- |
| `host` | Create and manage their own celebrations |
| `agent` | Build invitations for clients, earn commission, see a referral ledger |
| `admin` | See every account, invitation and order |

Roles are set at signup (`admin` is not self-assignable — promote via SQL, see `DEPLOY.md`).
Every boundary is enforced by Postgres row-level security in `supabase/migrations/`,
not by the UI.

Try a personalized, themed invite:
`/invite/swarnil-weds-prachi?g=Rahul%20%26%20Family&theme=nikah-emerald`

In dev, every page has a floating **🎨 Theme** button (bottom-right) to flip all 8 themes live.

## Scripts

```bash
npm run dev     # dev server with hot reload
npm run build   # production build (also typechecks)
npm run start   # serve the production build
npm run lint    # ESLint
npx tsc --noEmit  # typecheck only
```

## Working on the design system

The design system is a normal part of this repo — edit it and every page updates.

```
src/app/globals.css              ← ALL color/space/type/radius/shadow values (CSS variables)
                                    + the [data-theme="…"] overrides for each theme
src/design-system/tokens/        ← the same tokens exposed to TypeScript
src/design-system/motifs/        ← 12 SVG motifs (paisley, diya, jaali…), currentColor-based
src/design-system/motion/        ← Framer Motion presets (envelope-open, seal-break…)
src/design-system/components/    ← the component library (Button … Envelope, PetalRain)
src/themes/index.ts              ← the 8 theme definitions (vocabulary, motifs, meals, palette)
src/data/                        ← mock couples, guests, analytics, blessings
```

**The golden rule:** never hardcode a hex in a component. Add new values to
`globals.css` (+ mirror in `src/design-system/tokens/`) first, then use them via
Tailwind utilities (`bg-primary`, `text-accent`, `border-ornate`, `shadow-gold-glow`)
or `var(--…)`. Themes override **only** the semantic `--color-*` variables.

Typical workflows:

- **New component** → add it to `src/design-system/components/`, export from `index.ts`,
  add a live example on `src/app/design-system/components/page.tsx`.
- **New theme** → add a `[data-theme="my-theme"]` block in `globals.css` **and** a `Theme`
  object in `src/themes/index.ts`. It appears automatically in every switcher/gallery.
- **New motif** → add an SVG component to `src/design-system/motifs/index.tsx` and register
  it in the `motifs` map; the docs gallery picks it up automatically.
- **Docs** → everything under `src/app/design-system/` is the public docs site; it is built
  from the same tokens and components it documents.

## Data model

```
src/lib/supabase/       ← browser / server / admin clients + Database types
src/lib/queries.ts      ← server-side reads (RLS does the authorization)
src/lib/invite.ts       ← InviteView: the view model the invite page renders
src/lib/demo.ts         ← the three bundled showcase invites (no database rows)
supabase/migrations/    ← schema, RLS policies, storage bucket, analytics RPCs
```

`events` is the tenant object. A wedding's two partners live in `events.hosts`
(jsonb) rather than dedicated columns, so a birthday with one celebrant or a
corporate event with three hosts uses the same table. Ceremonies are rows in
`sub_events`.

Analytics are real: `/api/track` records a view per invite open, keyed by a
salted daily hash of IP + user-agent, so daily uniques are countable without
storing anything identifying.

**Payments are stubbed.** Orders are created with `provider = 'dummy'` and always
succeed; every plan is unlocked on purpose. The `orders` → `commissions` trigger
already models what a real gateway needs.

See `progress.md` for what's done vs. what's left, and `instruction.md` for the
original phase spec.
