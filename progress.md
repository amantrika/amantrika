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
- **Themes are a catalogue in Postgres** (`themes`), with a `free`/`premium`
  tier. The table holds identity, tier, tags, palette, `is_active` and
  `sort_order`; `src/themes/index.ts` still owns layout, motifs and everything
  that draws. `events.theme_id` is a real FK (`on delete restrict` — withdraw a
  theme with `is_active`, never a delete, or you break published invitations).
  - **Tier gates which themes you can pick. It never gates features.**
  - The two halves can drift silently in both directions;
    `tests/unit/theme-catalogue.test.ts` is the only thing that catches it.
  - Free set is one theme per faith, deliberately — charging a Muslim or Sikh
    family for the only theme that fits their wedding would be an ugly way to
    make money.
- **The theme gallery (`atheme`) is a second, display-only table.** The five
  designs Amantrika actually sells — Timeless Charm, Classic Elegance, Modern
  Chic, Eternal Grace, Indian Touch — imported from `themes.csv` as a name plus
  a Cloudinary photograph. They have **no renderer**: no entry in
  `src/themes/index.ts`, no `[data-theme]` block. That is why they are not rows
  in `themes`, which would have broken `theme-catalogue.test.ts`.
  - `atheme.render_theme_id` is a real FK into `themes` and is what an
    invitation is actually built with. Selecting "Classic Elegance" sets
    `theme_id = 'cathedral-white'`. The mappings were chosen by looking at the
    five photographs against the registry's layouts — they are documented row by
    row in the migration.
  - Shown on the landing page (`#designs`) and above the picker in the builder's
    theme step, both via `AthemeGallery`. Image, name, Preview (full-size modal)
    and Select.
  - Landing-page Select carries the choice as `/onboarding?theme=<render id>`,
    validated server-side against the catalogue before it reaches the client. A
    signed-out visitor goes through `/signup?next=…`, so `signUp` now honours a
    relative `next` the way login already did.
  - Three of the five map to premium themes; the card says so.
  - `tests/unit/atheme-gallery.test.ts` catches a card pointing at a theme the
    registry cannot draw.
  - Images need `NEXT_PUBLIC_CLOUDINARY_CLOUD` (`dxedclcqu`). Unset, the whole
    section is omitted rather than rendering broken images.
- **RSVP and the guestbook are paid features.** `rsvp` and `blessingWall` are
  false on `free`. Enforced in `InviteBody` (section not rendered) *and* in the
  Server Actions (the actual boundary — a Server Action is a public endpoint).
  `blessingWall` had existed unenforced since it was written.
- Premium themes are **badged, not locked**, in the builder: theme is step 6 and
  the plan is step 7, so locking there refuses a sale before it is offered. The
  plan step disables publishing and `startCheckout` refuses server-side.
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
  mobile drawer with a scrim and body scroll lock. Nav items carry an **icon**
  (`NavItem.icon`) — a small glyph in the bar, a ruled medallion in the drawer.
  `SiteHeader` lives in its own **client** module for that reason: icon
  components cannot be serialised across the server/client boundary.

### Design: the chrome pairing and the wedding ornament set
Done 8 Aug 2026. A visual pass over every surface that is *ours* rather than a
couple's — marketing, dashboard, admin, auth, onboarding, checkout.

- **Two type pairings, not one.** An invitation keeps its theme's face
  (Cormorant and the script faces). The chrome gets **Marcellus over Mulish**,
  applied by `.type-chrome` on each shell. It is a class rather than a rule on
  `<body>` because the default theme is declared on `:root`, so a body-level
  override would leak into every invitation using it.
- `--weight-display` is now a token. Marcellus, Rozha One and Yatra One ship a
  single 400 weight and were being synthetically emboldened to 600. Every theme
  states the weight its face actually has.
- `--text-hero` / `.type-hero` — a scale for the landing headline alone, separate
  from `display-xl`, which is drawn for couple names in a full-width column.
- `.dhaga-frame` and `.dhaga-rule` — the card-maker's edge: a hairline rule with
  a running-stitch thread inside it, and the same stitch as a fading divider.
  Used on the theme previews, the hero, page headers and the dashboard.
- **Theme cards are miniature invitations**, not palette strips
  (`src/components/site/ThemePreviewCard.tsx`). `data-theme` on the card
  rescopes every token, so the preview *is* the theme at a smaller size — add a
  theme to the registry and its card is correct with nothing drawn by hand.
- **The loader is a ring again** (`Loader`, `LoadingBlock`; `ShehnaiLoader` is
  gone). The shehnai was ours but unfamiliar in the one place where being
  instantly recognised is the whole job. The wedding is in the detail now: a
  dotted gold track, an accent arc, a bindi orbiting the rim. Pure CSS.
- **A post with no cover image gets a drawn title card** (`PostCover`) instead of
  nothing, so a mixed grid stops coming out ragged and a post page never opens
  on a headline against blank space.
- **`layout: "wide"`** for content pages (`about`, `how-it-works`): full content
  width, no contents rail. `.page-wide` pulls bare markdown back into a reading
  column while designed `<Section>` bands keep the whole page.
- **`<Journey>` / `<JourneyStep>`** — the stitched timeline `/how-it-works` is
  now built from. Nodes are SVG rings that draw once on load with a running
  stitch turning inside; the thread between them is a dashed SVG line. All CSS
  (`.draw-stroke`, `.thread-run`), so it is a server component and reduced
  motion is handled in one place. Each step still emits a real `<h2>` with a
  stable id, so the outline and fragment links survive.
- **Markdown twins are flattened** (`src/lib/content/plain-markdown.ts`). They
  were serving raw MDX, so `/about.md` came back as a wall of `<Section>` tags
  with the prose buried between them — worse than the HTML it replaces. Title
  and lead props are promoted to real headings; every other tag is dropped.
  Covered by `tests/unit/plain-markdown.test.ts`.
- **`rounded-pill` never worked.** Used in ~30 places, declared on `:root` but
  never registered in `@theme`, so Tailwind v4 emitted no utility and every
  "pill" had square corners. Registered.

- One default share card, `public/assets/og-default.png` — the mark, the
  wordmark and the tagline. `pageMetadata()` falls back to it, so every public
  page has an OG and a Twitter card instead of only the homepage. Generated by
  `scripts/build-og-default.mjs`; re-run it if the mark or the wording changes.
  Deliberately *not* an `app/opengraph-image` file — Next hands those down the
  whole route tree, and `/invite/[slug]` must be able to withhold `og:image`
  while watermarked. `/showcase` now goes through `pageMetadata()` like the
  rest, so it has a canonical too.

### Content
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

**The theme gallery is built and invisible — the migration was never applied.**
`atheme` does not exist in the database; the live API answers `PGRST205: Could
not find the table 'public.atheme'`. Everything above it is finished — the
table, RLS and five seeded rows in
`supabase/migrations/20260809093641_atheme_gallery.sql`, the cached read, the
Cloudinary URL builder, `AthemeGallery`, and both call sites on the landing page
and in the builder's theme step. It renders nothing because the query returns
nothing.

Two consequences were fixed on 9 Aug 2026 rather than left:

- **The project did not build at all.** `supabase.from("atheme")` cannot
  typecheck against a generated schema that has no such table, so every
  deployment was blocked, including work unrelated to this feature.
  `src/lib/supabase/types.ts` now declares the table through the same `Replace`
  layer the jsonb columns use. **That block is temporary and says so** — delete
  it once the migration is applied and types are regenerated.
- **The failure was silent.** `getCachedAthemes` discarded the Postgrest error,
  so a missing table, a wrong RLS policy and an empty catalogue all rendered as
  "no gallery". It logs the error now and still degrades to hiding the section.

What is verified: all five Cloudinary images resolve, and the
`f_auto,q_auto,w_800` transform returns ~40KB WebP instead of the ~990KB source
PNG. Applying the migration is item 5 in `next.md` §0 — it needs the database
password.

**~~Keystatic~~ removed 9 Aug 2026, because it deleted content.** It is gone —
config, routes, middleware gate, flag, both dependencies. Recorded here because
the *reason* matters more than the removal: its MDX field re-serialises the
whole file on save and silently drops any block it cannot round-trip. Two
reproductions, different components — saving `/about` deleted a
`<SplitFeature>` and the three paragraphs inside it; saving a post deleted one
of two `<Callout>`s. No error anywhere. Both were reverted with
`git checkout`; `content/` is unchanged.

It also could not open *any* of the twelve entries as shipped, because
`fields.mdx` refuses a file containing a component it has not been declared.
Declaring them fixed opening and thereby exposed the save bug — fixing the first
half is what enabled the damage. **If a structured editor over `content/` is
ever proposed again, the acceptance test is: open a file, save it unchanged,
confirm `git diff` is empty.**

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

**~~Blank hero.~~ Did not reproduce, 8 Aug 2026.** Checked in headless Chromium
against the dev server, at both `reducedMotion: no-preference` and `reduce`: the
`<h1>` is visible, `opacity: 1`, `transform: none`, 579×238. The hero has since
been rebuilt (still framer-motion, still dynamic `custom` variants), so if it
returns it is worth suspecting a specific browser rather than the pattern.
**Not verified in a real browser on a real machine** — only headless.

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
  boundary as a named string, not a callback. **A component counts as a
  function** — a lucide icon in a nav-item array fails the render with
  "Functions cannot be passed directly to Client Components", and it fails at
  *prerender*, so the build breaks on one page and you go looking at that page.
  Build the list inside the client module (`SiteHeader.tsx`, `DashboardNav.tsx`)
  rather than handing it in from a server shell.
- **A CSS variable on `:root` is not a Tailwind theme variable.** Tailwind v4
  only generates a utility for a variable declared in `@theme` / `@theme inline`.
  `--radius-pill` sat on `:root` for months; `rounded-pill` compiled to nothing
  and ~30 pills silently had square corners. If you add a token a utility should
  use, add it in both places — and check the compiled
  `.next/static/css/app/layout.css`, which is the only honest answer.
- **The default theme needs its own `[data-theme]` block even though `:root`
  already declares it.** A nested theme scope — a preview card, a docs demo —
  sits inside a surface that may have redefined `--font-heading`, and with no
  rule to match, the "default" theme inherits whatever it is nested in. Every
  other theme has a block; royal-maroon needs one too.
- **`useId` makes a component client-only.** `PatternBackground` uses it, which
  is why every consumer of it is `"use client"`. A server component that wants a
  motif wash uses the `motifs` set (plain inline SVG) or a CSS texture instead.
- **Markdown twins serve the MDX body.** Anything you express as a JSX prop
  instead of Markdown disappears from `/page.md` and `/llms-full.txt` unless
  `src/lib/content/plain-markdown.ts` knows how to flatten it. Add a rule to
  `HEADING_LEVELS` when you add a title-bearing block.
- **A timeline connector cannot hang off `top-full`.** A grid cell stretches to
  its row's height, so `top-full` puts the thread below the whole step rather
  than under the node. Anchor it to the node's own height, and hide the last
  one from the list (`[&>li:last-child_[data-thread]]:hidden`) — a step cannot
  know it is last.
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
