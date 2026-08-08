# Amantrika — Progress

**Living document.** Update it in the same commit as the work it describes — see
the rule in `CLAUDE.md`. Anything not written down here is lost the moment a
session ends, and more than one agent works in this repo.

Last updated: **8 Aug 2026**

---

---

## 🔴 Before you take a single real customer

Verified 8 Aug 2026. **`orders` where `status = 'paid'` is zero — a checkout has
never successfully completed on this system.** Everything below the money is
built and working; the money itself is untested end to end.

1. **Complete one test-mode purchase.** Provider is `dodo`, `DODO_ENVIRONMENT`
   is `test_mode`, keys are set in Vercel. Nobody has driven a card through it.
2. **Register the webhook** in the Dodo dashboard against
   `https://amantrika.imswarnil.com/api/payments/webhook` (the route responds and
   correctly rejects malformed posts, so it is ready — it is just not called).
   Without it a customer pays and their invitation never publishes. That is the
   worst failure this product can have.
3. **Add `https://amantrika.imswarnil.com/auth/callback`** to the authorised
   redirect URIs in Google Cloud. Google SSO works locally and fails on the live
   domain only, which is the kind of bug that is invisible until a real person
   hits it.
4. **Rotate the OpenRouter key.** Scrubbed from git history and never pushed to
   GitHub, but it sat in a local repo, two agents' context windows and a stash.
   Never pushed is not the same as never seen.

Items 1–3 need a human with dashboard access. No agent can do them.

---

## Where it runs

| | |
| --- | --- |
| Production | <https://amantrika.imswarnil.com> |
| Repository | `github.com/amantrika/amantrika` (private) |
| Supabase | project `Amantrika`, ref `wzwzeoqaaronnuvfzvxf`, region `ap-southeast-1` |
| Vercel | project `amantrika`, Hobby plan |

**Pushing to `main` deploys production. Pushing to any other branch builds a
Preview and changes nothing live.**

This has now been wrong in this file twice, in both directions, so here is what
was actually observed on 8 Aug 2026: a push to `n8n-automation-layer` produced a
deployment marked `Preview`; a push to `main` produced one marked `Production`,
and the live site served it a minute later. The GitHub integration *is*
connected — the earlier note saying it "does not build this project" was drawn
from a `vercel ls` full of CLI-authored deploys, which is what you get when
every push goes to a non-production branch.

`vercel --prod` still works and is the way to ship without pushing. Either way,
`vercel ls` tells you whether the deployment was Production or Preview — and a
READY deployment is still not a rendering page, so load it.

Accounts for Supabase, Vercel and GitHub are **dedicated to Amantrika**, separate
from any personal ones. Git commits are authored as `Amantrika` — a commit from
another identity is rejected by Vercel on Hobby, which fails the deploy.

---

## ✅ Shipped

### Foundation
- Next.js 15 App Router · Tailwind 4 · TypeScript · Framer Motion.
- Design system: tokens as CSS variables with per-theme `[data-theme]` overrides,
  motifs, motion presets, ~60 components.
- **The logo.** `src/design-system/brand/` exports `AmantrikaMark`,
  `AmantrikaWordmark`, `AmantrikaLogo`, `AmantrikaBadge`; standalone SVGs live in
  `public/brand/`; the favicon is `src/app/icon.svg` and the iOS icon is rendered
  by `src/app/apple-icon.tsx`. Two colour slots only — `currentColor` for the
  arch, `--logo-accent` (default: the theme accent) for the tie-beam and
  marigold — so it recolours with the site instead of carrying brand hexes.
  Documented at `/design-system/components/logo`.
- 12 themes. Docs at `/design-system` are **local-only** — gated on the request
  host, because Next inlines `process.env` into middleware and static bundles at
  build time, so an env-based flag freezes to whatever the build machine had.

### Database & auth
- Postgres schema in `supabase/migrations/`. `events` is the tenant object;
  a wedding's partners live in `events.hosts` (jsonb), so birthdays and corporate
  events reuse the same tables with a different `event_type`.
- RLS on every table. Three roles: `host`, `agent`, `admin`.
- Email/password **and** Google SSO; both converge on `handle_new_user`.
- Admin is granted by an `admin_allowlist` table enforced by a trigger, so
  `role = 'admin'` is impossible for any other address regardless of write path.

### The product
- Onboarding writes real drafts; live slug availability; ceremony presets per
  occasion; photo upload straight to Supabase Storage.
- Invite pages render from the database. RSVPs and blessings persist; blessings
  can be moderated.
- Host dashboard: view counts, unique visitors, 14-day trend, RSVPs, meal
  counts, guest import, personalised per-guest links.
- Agent dashboard: clients, referral code, commission ledger.
- Checkout → `/checkout/success/[eventId]`.
- Free invitations carry a floating **"Made with Amantrika"** badge (not a tiled
  watermark) whose clicks are counted per invitation.

### Showcase
- Consent is default-off, audited append-only with the verbatim wording shown at
  the time, and only makes an invitation *eligible*.
- What publishes is a **sanitised clone** — address reduced to a city, phones,
  gift and payment details stripped, guests and RSVPs never copied, optional
  first-names-only. The gallery never links to a family's live invitation.
- Withdrawing deletes the clone immediately.

### Community roadmap
- `/roadmap` = the written plan (MDX) + a live board.
- Voting is anonymous, one per person, deduped by a **stable** salted IP hash
  (deliberately *not* the daily-rotating hash used for view counting — that
  would allow one vote per day).
- Proposing requires an account. Admin triage at `/admin/requests`; moving a
  request off `open` closes its voting. Declining asks for a public reason.
- Leaderboard ranks by votes *received*, not requests posted.

### Members
- `/profile` — name, phone, city, Instagram (normalised from URL/@/handle), what
  they're celebrating, bio.
- Apply to the partner programme from the profile. Creates `agents` as `pending`
  and **does not** change the caller's role; approval is an admin action.

### Admin
- Overview with a 7/30/90-day filter held in the URL, period-over-period trend
  tiles, three time-series charts and four breakdowns.
- People & roles, invitations, partner approvals, showcase curation, plans
  editor, feature-request triage, badge-referral analytics.

### Analytics & ops
- PostHog: client, server and OTel logs; ~40 typed events; browser traffic
  proxied through `/ingest` so content blockers don't silently drop it.
- Privacy rule: properties describe behaviour, never people. Guest names,
  emails and message bodies stay in Postgres; guest events are anonymous.
- Vercel Analytics + Speed Insights.
- Marketing reads are cached (`src/lib/cache.ts`). Homepage TTFB went
  **2.9s → ~0.5s**.
- `.vercelignore` — CLI deploys were uploading ~500 MB and failing with EPIPE.

### Site chrome
- One `SiteHeader` / `SiteFooter` for the landing page and every marketing page,
  wrapping the design system's `Navbar`. The header carries the logo, an
  active-link rule, a scroll-reactive surface, a skip link to `#main`, and a
  mobile drawer with a scrim and body scroll lock.

- One default share card, `public/assets/og-default.png` — the mark, the
  wordmark and the tagline. `pageMetadata()` falls back to it, so every public
  page has an OG and a Twitter card instead of only the homepage. Generated by
  `scripts/build-og-default.mjs`; re-run it if the mark or the wording changes.
  Deliberately *not* an `app/opengraph-image` file — Next hands those down the
  whole route tree, and `/invite/[slug]` must be able to withhold `og:image`
  while watermarked. `/showcase` now goes through `pageMetadata()` like the
  rest, so it has a canonical too.

### Content
- **Keystatic at `/keystatic`** — an editing UI for the MDX already in the repo.
  Not a CMS in the usual sense: no database, no content API. It reads and writes
  the same files in `content/`, so Zod still validates at read time, a malformed
  post still fails the build, and the markdown twins, RSS, sitemap and JSON-LD
  still derive from the filesystem. `project-overview.md` §2.10 stands.
  - **Local only.** Storage is `local`, so it edits a checkout; on a deployment
    there is no writable repo and every save would fail. `src/middleware.ts`
    404s both `/keystatic` and `/api/keystatic/*` off a local host, and there is
    no `SHOW_` escape hatch — unlike the design-system docs, no version of this
    is worth sharing from a preview.
  - `keystatic.config.ts` **must mirror `src/lib/content/schema.ts`**. The UI
    validates as you type, Zod validates at build; if they disagree the editor
    saves a post that then breaks the build. `categories` and `pageLayouts` are
    imported from the schema so they cannot drift — do the same for any new
    enum rather than retyping the values.
  - Frontmatter `slug` is now **optional and derived from the filename**, which
    is what the URL was always built from. Keystatic writes the slug as the
    filename and no frontmatter key. Declaring a *different* slug is still a
    hard error.
  - The editor bundle (~1 MB) sits only on its own route. Verified against a
    build with the routes removed: the guest invitation loads none of it.
- Blog, content pages, `llms.txt`, markdown twins, RSS, JSON-LD *(built by the
  other agent)*.
- `/changelog` and `/roadmap` as MDX.
- Dodo payments, entitlements, watermark plumbing, AI console *(other agent)*.

### Lifecycle email & scheduling
- **The scheduler is in the app**, not a side-car: `src/app/api/cron/[job]`,
  guarded by `CRON_SECRET` in constant time, scheduled in `vercel.json`.
  Unauthenticated callers get 404, not 401, so the route's existence is not
  confirmed to strangers.
- `src/lib/notifications/` claims every message in `automation.notifications`
  **before** sending it, keyed on a deterministic dedupe key. Overlapping
  schedules, a retried cron delivery and a manual run during a scheduled one are
  all safe. `?dryRun=1` renders and ledgers without sending.
- The **abandoned-draft nudge sequence** (spec §15) is ported and tested — five
  messages bucketed by idle time and gated on completion score.
- **One-click unsubscribe** at `/api/unsubscribe`, RFC 8058 `POST` and the human
  `GET`, HMAC-signed over address and scope so editing the address in the URL
  cannot unsubscribe someone else. Honoured immediately, no confirmation step.
- **n8n was retired** (8 Aug 2026). It was well built, but it meant a second
  email path outside `sendEmail()`, 56KB of logic invisible to typecheck and the
  test suite, and a second deployment to operate. The `automation` schema and the
  candidate SQL were kept and moved into the app. Reasoning in `wont-do.md`;
  port status in `n8n/README.md`.

### Testing
- **Vitest + Playwright, 216 tests, green.** `npm test` runs both;
  `npm run test:report` opens the HTML report with traces and video.
- e2e drives a **production build**, not `next dev` — the dev server invalidates
  route handlers after `revalidatePath`, which makes the payment webhook 404 on
  the second call and would make the suite lie.
- Covers: the payment webhook (forged signature, tampered body, underpayment,
  replay), the free/paid split, SEO and LLM rules as hard assertions, secret-leak
  scanning of every downloaded payload, and the scheduler's auth and idempotency.

---

## 🔜 Pending

### Blocking real customers
- [ ] **Verify a Dodo test checkout end to end.** Env vars are set and the
      provider is `dodo`/`test_mode`, but no purchase has ever been completed.
      Needs a card flow nobody has driven yet.
- [x] ~~Register the Dodo webhook~~ — done. `ep_3HcBzEGYTTQrPTbhld6MCo9K0nI`,
      enabled, pointing at `/api/payments/webhook`, filtered to
      `payment.succeeded`, `payment.failed`, `refund.succeeded`. Created via the
      API, verified present.
- [ ] **Add `https://amantrika.imswarnil.com/auth/callback`** to the authorised
      redirect URIs in Google Cloud, or Google SSO fails on the live domain only.
- [x] ~~Run `clean_demo_data()`~~ — done 8 Aug 2026.
- [x] ~~Clear test revenue~~ — done. All four test orders (mock and dodo
      test-mode) and their ledger rows deleted; admin now reports ₹0. The two
      invitations they published keep `plan_code = 'premium'`, deliberately:
      they are the owner's own, and downgrading them would put a badge on links
      that may already be shared.

### Product
- [ ] Route-level loading states. `ShehnaiLoadingBlock` exists but only `Button`
      uses the loader; `loading.tsx` on dashboard and invite routes is where it
      would actually be felt.
- [ ] Design polish — colour, typography, font pairing. Explicitly deferred.
- [ ] Guest messaging, languages, custom domains, post-wedding album — see
      `/roadmap`.

### Housekeeping
- [x] ~~`README.md` is stale~~ — rewritten. Payments, the paywall, the
      scheduler and the test commands are described as they actually are, and
      it now points at `progress.md` / `wont-do.md` / `plan.md`.
      One correction to the old entry: `/invite/swarnil-weds-prachi` **does**
      still work — it is one of three bundled invitations served with no
      database row, and `tests/e2e/invite.spec.ts` now asserts all three.
- [ ] **Port the remaining ten lifecycle workflows** — owner alerts, RSVP
      digests, publish confirmation, expiry warning, post-event wrap-up, guest
      reminders. `n8n/README.md` tracks them. Mechanical now the substrate
      exists: move the query into a `security definer` function, write a render
      function, add an entry to `JOBS` and a schedule. Delete `n8n/` when done.
- [ ] Decide whether `main` or `n8n-automation-layer` is the trunk (below). The
      branch name is now misleading — n8n is retired — but Vercel deploys
      production from it, so renaming is not a free action.

---

## ⚠️ Known issues

**`/invite/[slug]` and `/roadmap` were returning 500 in production — fixed and
deployed 8 Aug 2026.** Verified live: `/invite/swarnil-weds-prachi` and
`/roadmap` both return 200, and a missing slug still 404s.
Caching those reads (`993c788`) left them on `createClient()`,
which reads cookies, inside `unstable_cache`, which forbids it. Next throws
rather than degrading, so the product's single most important route was down on
the live site and nobody knew. `getPublishedInvite()`, `listFeatureRequests()`
and `featureLeaderboard()` now use `createPublicClient()`. The convention was
already written down below; the call sites simply never followed it.

Worth sitting with: `tests/e2e/invite.spec.ts` asserts a 200 on that route and
would have caught this immediately. The suite was not run before the caching
commit shipped. Nothing about the code prevented this — only the habit.

**~~Branch divergence.~~ Resolved 8 Aug 2026.** `main` was fast-forwarded to
`n8n-automation-layer`; both are at `bddc17a` and pushed. There was nothing to
merge in the other direction — `origin/main` was already an ancestor.

**Blank hero, unresolved.** The homepage hero rendered blank in two browser
checks. Traced to framer-motion 13 and dynamic `custom` variants — elements with
`custom` stayed hidden while one without it appeared. Predates all recent work
(`framer-motion: ^13` and the `custom` pattern are both in commit `2793102`).
Could not be confirmed: the browser used may have had reduced-motion set. **Needs
thirty seconds on a real machine to settle.**

**Demo data is gone from production** (8 Aug 2026). Five seeded invitations,
three showcase clones and five `@example.com` accounts deleted. `/showcase` is
now empty rather than showing invented families — correct, not a regression.

**`clean_demo_data()` never worked, and now does.** It was `security invoker`, so
deleting from `auth.users` ran as the caller and failed with "permission denied
for table users". Fixed in migration `20260808130049`, and execute is revoked
from every PostgREST role — it is callable from the SQL editor as `postgres`,
which is where a destructive one-shot belongs.

**`auth.admin.listUsers()` is fixed.** Root cause was `seed-demo.sql` inserting
into `auth.users` with NULL token columns; GoTrue scans those into non-nullable
Go strings, and one bad row broke the Admin API for the whole project. Repaired
in `20260808130223`, and the seed now writes `''`. This also unblocked deleting
the demo accounts.

**The mock checkout was posting its webhook to the wrong server.**
`simulatePayment` built the URL from `NEXT_PUBLIC_SITE_URL`, so a test server on
:3100 posted to :3000 — whatever else happened to be running. It looked fine for
days because that other server shared this database, so the assertions passed
while the request under test went elsewhere. It now derives the origin from the
incoming request headers. Fixed 8 Aug 2026.

**A live OpenRouter key reached `.env.example` twice.** Removed in `7eb3a94`,
then written back an hour later by a concurrent `git add -A`. That file is
tracked and the repo has a GitHub remote. It has been moved to `.env.local`
(gitignored) and the template restored. **The key `sk-or-v1-aa1802…` was never
committed the second time, but it did sit in the working tree — rotate it if
that is not already done.** The first key was reported revoked; confirm.

**Two agents, one working tree.** A concurrent `npm install` once wiped installed
packages mid-task; migration timestamps have interleaved and needed
`--include-all` twice. A rebuild wiped the e2e server's `.next` mid-run three
times, producing test failures that were not real — the fix was `NEXT_DIST_DIR`
(below), but a source tree changing under a running suite still cannot be made
safe. Give each agent its own worktree, or run them one at a time.

---

## Conventions worth not relearning

- **Migrations are append-only and ordered.** Never renumber one that is already
  applied. If a new file sorts before an applied one, rename it to a later
  timestamp rather than forcing it in with `--include-all`.
- **`supabase config push` sends the whole local `[auth]` block.** It silently
  turned email confirmation off once. Read the diff before accepting; re-running
  should report `up_to_date`.
- **Regenerate types after every migration**:
  `supabase gen types typescript --linked > src/lib/supabase/types.generated.ts`.
  `types.ts` layers the jsonb shapes back on top — do not edit the generated file.
- **Public cached reads use `createPublicClient()`**, not `createClient()`. The
  latter reads cookies, which Next forbids inside `unstable_cache`.
- **`events` ↔ `assets` has two foreign keys.** An unqualified PostgREST embed is
  ambiguous and fails with `PGRST201`, which surfaces as an *empty result*, not
  an error. Always pin: `assets!assets_event_id_fkey(...)`.
- **Tailwind resolves conflicting utilities by stylesheet order, not class
  order.** A component that ships its own `size-[1.5em]` default beats a
  caller's `size-8`, silently. Defaults that a caller should be able to override
  belong in `width`/`height` attributes, which any class beats.
- **The logo shape exists in four files and they drift silently.**
  `src/design-system/brand/index.tsx`, `public/brand/*.svg`, `src/app/icon.svg`,
  `src/app/apple-icon.tsx`. The standalone ones declare their own colour
  variables because a favicon or an `<img>` inherits no CSS from the page, and
  the favicon is drawn heavier on purpose — the real mark's weight disappears at
  16px. Change the mark, change all four.
- **An MDX block that styles its own text cannot be a `<p>`.** MDX wraps the
  text an author writes between two blank lines in a paragraph of its own, and
  it cannot be told not to. A `<p>` inside a `<p>` is invalid — the browser
  closes the outer one early, the server markup and the client tree disagree,
  and hydration fails. Render the block as a `<div>` and add
  `.type-inherit-prose` (`src/app/globals.css`) so the inner paragraph inherits
  the wrapper's type instead of carrying its own.
- **Never pass a function as a prop to a client component.** Formatters cross the
  boundary as a named string, not a callback.
- **`NEXT_DIST_DIR` isolates a second Next process.** Two `next dev`/`next build`
  runs in one checkout corrupt each other's `.next`. The e2e suite builds to
  `.next-e2e`; the other agent uses `.next-claude`. `.gitignore` ignores
  `/.next-*/` and eslint ignores `.next-*/**` — without the latter,
  `npx eslint .` reports ~33,000 problems from generated code and hides the two
  real ones.
- **The e2e suite sets `ALLOW_MOCK_PAYMENTS=true` on its own server.** `next start`
  runs as production, where mock checkout is correctly disabled. That is the
  guard working, not a workaround — but it does mean the guard itself is not
  covered by a test.
- **Never insert into `auth.users` with NULL token columns.** GoTrue scans
  `confirmation_token`, `recovery_token`, `email_change`,
  `email_change_token_new`, `phone_change` and `phone_change_token` into
  non-nullable Go strings; one NULL row breaks `listUsers()` and `deleteUser()`
  for the entire project. Write `''`.
- **`automation` is not exposed to PostgREST** and must stay that way. The app
  reaches the ledger through `security definer` functions in `public` granted to
  `service_role` alone, so the table itself stays invisible.
- **`vercel.json` rejects unknown keys** — a `//` comment fails the whole deploy.
  Hobby allows one cron run per day.
