# Deploying Amantrika

Amantrika uses **its own dedicated Supabase and Vercel accounts**, separate from
any personal ones. They are connected by hand — copying keys into environment
variables — rather than through the Vercel Marketplace Supabase integration,
which would tie the two accounts' billing together.

Repository: `github.com/amantrika/amantrika` (private).

The Supabase project is `Amantrika`, ref `wzwzeoqaaronnuvfzvxf`, region
`ap-southeast-1` (Singapore).

---

## 1 · Supabase

The CLI may still be signed into a different account. Switch first:

```bash
supabase logout
supabase login                       # sign in as the Amantrika account
supabase projects list               # confirm you see the Amantrika project
```

Then link this repo and push the schema:

```bash
supabase link --project-ref <YOUR_PROJECT_REF>
supabase db push                     # runs everything in supabase/migrations/
```

`db push` is the first time this SQL runs anywhere — if a statement fails it
stops and reports the line, and nothing is half-applied.

`db push` applies three migrations, in order:

| Migration | What it creates |
| --- | --- |
| `..._core_schema.sql` | Tables, enums, the signup trigger, the commission trigger, seed plans |
| `..._rls.sql` | Row-level security for host / agent / admin, plus public read of published invites |
| `..._storage_and_rpc.sql` | The `event-assets` bucket and the analytics functions |

### Auth settings

In **Authentication → URL Configuration**:

- Site URL: `https://amantrika.imswarnil.com`
- Redirect URLs: add `https://amantrika.imswarnil.com/auth/callback`
  and `http://localhost:3000/auth/callback`

**Keep email confirmation on** (the Supabase default, under
**Authentication → Providers → Email**). The signup form already handles it:
when no session comes back it shows a "check `you@example.com` for a
confirmation link" notice, and `/auth/callback` exchanges the emailed code for a
session and routes the user to the dashboard their role belongs to.

### Make yourself an admin

Roles are assigned at signup and `admin` is deliberately not self-assignable.
Sign up normally, then promote yourself from the SQL editor:

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

### Regenerate the TypeScript types

Run this after **every** migration:

```bash
supabase gen types typescript --linked > src/lib/supabase/types.generated.ts
```

`types.generated.ts` is the source of truth for column names and nullability.
`types.ts` imports it and layers back the two things generation can't express:
the real shapes behind the jsonb columns (`events.hosts`, `story_moments`,
`hotels`, `settings`, `plans.features`) and the jsonb return types of the
`event_stats` / `agent_stats` RPCs. Don't edit `types.generated.ts` by hand.

---

## 2 · Environment variables

Copy `.env.example` to `.env.local` and fill in the values from
**Project Settings → API**:

| Variable | Where it comes from | Exposed to browser |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` public key | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key | **no — never commit** |
| `NEXT_PUBLIC_SITE_URL` | your public origin | yes |

`NEXT_PUBLIC_SITE_URL` matters in production: invite links, guest links and
OAuth redirects are all built from it, and `VERCEL_URL` is not readable in the
browser.

---

## 3 · Vercel

As with Supabase, the CLI may be signed into a personal account. Switch first:

```bash
vercel logout
vercel login                         # sign in as the Amantrika account
vercel whoami                        # confirm
```

Then:

```bash
vercel link                          # creates the project
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_SITE_URL production      # https://amantrika.imswarnil.com
vercel --prod
```

Repeat the `env add` calls for `preview` and `development` if you want branch
deploys to work against the same database.

Alternatively, connect the GitHub repo from the Vercel dashboard so every push
to `main` deploys automatically. The Amantrika Vercel account will need access
granted to `amantrika/amantrika` during the GitHub app install.

### Custom domain

```bash
vercel domains add amantrika.imswarnil.com
```

Then add the CNAME Vercel prints at your DNS provider for `imswarnil.com`:

```
amantrika   CNAME   cname.vercel-dns.com.
```

---

## 4 · What is still a stub

**Payments.** `provider` is `'dummy'` on every order and checkout always
succeeds. Every plan is unlocked on purpose while the product is in preview.
Swapping in Razorpay means changing `publishEvent()` in
`src/app/onboarding/actions.ts` to create a real order and confirming it from a
webhook — the `orders` and `commissions` tables, and the commission trigger,
already model what a real gateway needs.

---

## Local development

```bash
npm install
cp .env.example .env.local     # then fill it in
npm run dev
```

The three bundled showcase invites (`/invite/swarnil-weds-prachi`,
`/invite/ahmed-weds-fatima`, `/invite/james-weds-emily`) render from
`src/data/couples.ts` and work against an empty database, so the marketing
links never 404 on a fresh install.
