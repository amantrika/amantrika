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
| `/design-system` | **The living design system** (start here) — local only, gated on the request host |
| `/signup` · `/login` | Accounts — host or partner agent |
| `/onboarding` | Create-your-invitation flow (7 steps, writes to Supabase) |
| `/dashboard` | Your celebrations; `/dashboard/[id]` for analytics, guests, photos, settings |
| `/agent` | Partner dashboard: clients, referral code, commission ledger |
| `/admin` | Platform-wide view (requires `role = 'admin'`) |
| `/invite/swarnil-weds-prachi` | Live invitation — tap the wax seal! (bundled, needs no database row) |

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

In dev, every page has a floating **🎨 Theme** button (bottom-right) to flip all 12 themes live.

## Scripts

```bash
npm run dev        # dev server with hot reload
npm run build      # production build (also typechecks)
npm run start      # serve the production build
npm run lint       # ESLint
npx tsc --noEmit   # typecheck only

npm test           # unit + end-to-end, then where to find the report
npm run test:unit  # fast: pricing and webhook verification, no browser or DB
npm run test:e2e   # Playwright against a production build
npm run test:report # open the last HTML report
```

End-to-end tests create `e2e-` prefixed rows in whichever Supabase project
`.env.local` points at and delete them in teardown. They drive a **production
build**, not `next dev` — the dev server invalidates route handlers after
`revalidatePath`, which makes the payment webhook 404 on the second call.

## Working on the design system

The design system is a normal part of this repo — edit it and every page updates.

```
src/app/globals.css              ← ALL color/space/type/radius/shadow values (CSS variables)
                                    + the [data-theme="…"] overrides for each theme
src/design-system/tokens/        ← the same tokens exposed to TypeScript
src/design-system/motifs/        ← 12 SVG motifs (paisley, diya, jaali…), currentColor-based
src/design-system/motion/        ← Framer Motion presets (envelope-open, seal-break…)
src/design-system/components/    ← the component library (Button … Envelope, PetalRain)
src/themes/index.ts              ← the 12 theme definitions (vocabulary, motifs, meals, palette)
src/themes/layout.ts             ← per-theme structure: sections, order, hero variant, rhythm
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

## Payments and the paywall

Payments are **real**, behind a provider interface (`src/lib/payments/`). Two
implementations: `mock`, which POSTs properly signed webhooks to the real
handler, and `dodo` (DodoPayments, currently a test-mode key). `PAYMENT_PROVIDER`
chooses; nothing else in the codebase names a provider.

Three rules hold the trust boundary:

- **Prices are computed only in `src/lib/pricing.ts`.** No amount is ever taken
  from the client.
- **Only the webhook may mark an order paid.** The browser callback after
  checkout grants nothing and changes no state — it navigates to a dashboard
  that polls the order row. `/api/payments/webhook` reads the raw body before any
  parser touches it, verifies the signature, and is idempotent by provider
  payment id.
- **Entitlements resolve server-side** from `events.plan_code`, which only the
  webhook writes (`src/lib/entitlements.ts`). Free invitations carry a "Made with
  Amantrika" badge and are denied reach — no OG image, no `Event` structured
  data, no indexing.

## Scheduled work

Lifecycle email runs from `src/app/api/cron/[job]`, guarded by `CRON_SECRET` and
scheduled in `vercel.json` — not a second service. Every message is claimed in a
ledger before it is sent, so overlapping schedules and manual runs cannot send
twice. `?dryRun=1` renders and ledgers without sending.

## Where to look next

| File | What it answers |
| --- | --- |
| `progress.md` | What is shipped, pending, and known-broken right now |
| `wont-do.md` | What was deliberately not built, and why |
| `plan.md` | The phase order and what "done" means for each |
| `project-overview.md` | The product spec — the source of truth |
| `CLAUDE.md` | The rules that apply while writing code here |
| `DEPLOY.md` | Supabase and Vercel setup |
