# Deploying Amantrika

Vercel and Supabase are connected by hand rather than through the Vercel
Marketplace integration, so the two accounts can stay under separate emails.

---

## 1 · Supabase

Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
Region `ap-south-1` (Mumbai) is the right default for an Indian audience.

Then link this repo and push the schema:

```bash
supabase login                       # opens a browser
supabase link --project-ref <YOUR_PROJECT_REF>
supabase db push                     # runs everything in supabase/migrations/
```

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

Email confirmation is on by default. The signup form handles both cases —
it shows a "check your email" notice when no session comes back.

### Make yourself an admin

Roles are assigned at signup and `admin` is deliberately not self-assignable.
Sign up normally, then promote yourself from the SQL editor:

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

### Regenerate the TypeScript types

`src/lib/supabase/types.ts` is hand-written to mirror the migrations. Once the
project is linked, replace it with generated types:

```bash
supabase gen types typescript --linked > src/lib/supabase/types.ts
```

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

```bash
vercel login
vercel link                          # creates the project
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_SITE_URL production      # https://amantrika.imswarnil.com
vercel --prod
```

Repeat the `env add` calls for `preview` and `development` if you want branch
deploys to work against the same database.

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
