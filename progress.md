# Amantrika — Progress

**Living document.** Update it in the same commit as the work it describes — see
the rule in `CLAUDE.md`. Anything not written down here is lost the moment a
session ends, and more than one agent works in this repo.

Last updated: **8 Aug 2026**

---

## Where it runs

| | |
| --- | --- |
| Production | <https://amantrika.imswarnil.com> |
| Repository | `github.com/amantrika/amantrika` (private) |
| Supabase | project `Amantrika`, ref `wzwzeoqaaronnuvfzvxf`, region `ap-southeast-1` |
| Vercel | project `amantrika`, Hobby plan |

Accounts for Supabase, Vercel and GitHub are **dedicated to Amantrika**, separate
from any personal ones. Git commits are authored as `Amantrika` — a commit from
another identity is rejected by Vercel on Hobby, which fails the deploy.

---

## ✅ Shipped

### Foundation
- Next.js 15 App Router · Tailwind 4 · TypeScript · Framer Motion.
- Design system: tokens as CSS variables with per-theme `[data-theme]` overrides,
  motifs, motion presets, ~60 components.
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
- [ ] **Register the Dodo webhook** in their dashboard. Without it a customer
      pays and their invitation never publishes — the worst possible failure.
- [ ] **Add `https://amantrika.imswarnil.com/auth/callback`** to the authorised
      redirect URIs in Google Cloud, or Google SSO fails on the live domain only.
- [ ] **Run `select clean_demo_data();`** before real users arrive. Production
      currently shows fictional invitations, guests and ~₹18k of fake revenue.

### Product
- [ ] Route-level loading states. `ShehnaiLoadingBlock` exists but only `Button`
      uses the loader; `loading.tsx` on dashboard and invite routes is where it
      would actually be felt.
- [ ] Design polish — colour, typography, font pairing. Explicitly deferred.
- [ ] Guest messaging, languages, custom domains, post-wedding album — see
      `/roadmap`.

### Housekeeping
- [ ] **`README.md` is stale** — claims payments are stubbed, says 8 themes
      (there are 12), links `/invite/swarnil-weds-prachi` (no longer exists) and
      sends people to `/design-system` (404 on any deployment).
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

**Branch divergence.** Production is deployed from **`n8n-automation-layer`**,
not `main`. `main` is behind by several sessions of work. Not merged yet because
the other agent has uncommitted changes in flight, and sweeping a half-finished
state into trunk is worse than the divergence. Decide deliberately.

**Blank hero, unresolved.** The homepage hero rendered blank in two browser
checks. Traced to framer-motion 13 and dynamic `custom` variants — elements with
`custom` stayed hidden while one without it appeared. Predates all recent work
(`framer-motion: ^13` and the `custom` pattern are both in commit `2793102`).
Could not be confirmed: the browser used may have had reduced-motion set. **Needs
thirty seconds on a real machine to settle.**

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
- **Test teardown finds users through `profiles`, not `auth.admin.listUsers()`**,
  which errors on this project with "Database error finding users count". Root
  cause unknown.
- **`automation` is not exposed to PostgREST** and must stay that way. The app
  reaches the ledger through `security definer` functions in `public` granted to
  `service_role` alone, so the table itself stays invisible.
- **`vercel.json` rejects unknown keys** — a `//` comment fails the whole deploy.
  Hobby allows one cron run per day.
