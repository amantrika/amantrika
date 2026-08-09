# Next phase — start here

Written 8 Aug 2026 at the end of a long session. Everything below is verified,
not assumed; where something is unverified it says so.

**Read first:** `PROJECT-GRAPH.md` (what the product is), then this file (what to
do). `ARCHITECTURE.md` for where code lives. `progress.md` for the running log.

---

## The state in one paragraph

Amantrika is live at <https://amantrika.imswarnil.com>, deployed from `main`,
sub-second on every route. Auth, invitations, guests, RSVPs, blessings, photo
uploads, the showcase with consent, the community roadmap, partner applications,
member profiles and a full admin area all work. **The money does not** — zero
payments have ever completed. That is the whole of the risk.

---

## 0a. ~~Push, before anything else~~ — done 8 Aug 2026

The `/invite/[slug]` and `/roadmap` 500s are **fixed, deployed and verified
live**: both return 200, a missing slug still 404s. `main` and
`n8n-automation-layer` are both at `bddc17a`.

**How deploying actually works** — this cost an outage and then two wrong
corrections, so it is written from what was observed rather than assumed:

- Push to **`main`** → Vercel builds it as **Production** and it goes live.
- Push to **`n8n-automation-layer`** (or any other branch) → **Preview** only.
  Nothing changes on the live site. This is what made the `/invite/[slug]` fix
  look shipped while the site stayed broken.
- `vercel --prod` deploys without pushing, and is what the CLI-authored
  deployments in `vercel ls` are.

Work happens on `n8n-automation-layer`; shipping means fast-forwarding `main`
(`git push origin n8n-automation-layer:main`). Then check `vercel ls` for a row
marked **Production**, and load the page — a READY deployment is not a rendering
page.

Cause, for the record: caching those reads left them calling `createClient()`
inside `unstable_cache`, and Next throws rather than degrading when a cached
function touches `cookies()`. `tests/e2e/invite.spec.ts` asserts a 200 on that
route and would have caught it; the suite was not run before the caching commit
shipped.

---

## 0. Blocked on a human — do these first, or nothing else matters

No agent can do these. They need dashboard access.

| # | Task | Why it matters |
| --- | --- | --- |
| 1 | **Complete one test-mode purchase** | `orders where status='paid'` is **zero**. Checkout has never worked end to end. |
| 2 | **Register the Dodo webhook** → `https://amantrika.imswarnil.com/api/payments/webhook` | Without it a customer pays and their invitation **never publishes**. The route is live and correctly rejects malformed posts — it is simply never called. |
| 3 | **Add `https://amantrika.imswarnil.com/auth/callback`** to Google Cloud authorised redirect URIs | Google SSO works locally and fails on the live domain only. Invisible until a real person hits it. |
| 4 | **Rotate the OpenRouter key** at openrouter.ai/settings/keys | Scrubbed from git history and never pushed to GitHub, but it sat in a local repo, two agents' contexts and a stash. |
| 5 | **Apply the atheme migration** — `npx supabase db push`, then regenerate types | The theme gallery is fully built and shows **nothing**: `atheme` does not exist in the database. Confirmed against the live API — `PGRST205: Could not find the table 'public.atheme'`. The CLI prompts for the database password, which no agent has. |

**#5 in full**, because there is a second half that is easy to forget:

```bash
npx supabase db push                       # applies 20260809093641_atheme_gallery.sql
npx supabase gen types typescript --linked > src/lib/supabase/types.generated.ts
```

Then delete the temporary `AthemeTable` block in `src/lib/supabase/types.ts` —
it is a hand-written stand-in for the generated table and says so. Leaving it
means a schema and a type that can drift with nothing to catch it.

**When #1 is done**, also open `/receipts/[orderId]` for that order. The receipt
page is built and deployed but has never rendered with real data, because no
paid order exists.

---

## 1. Images — the biggest remaining performance win

Everything else is already sub-second. This is what is left.

**Problem.** Galleries use plain `<img>`. No resizing, no WebP/AVIF negotiation,
no blur placeholder. An invitation with a dozen wedding photographs ships a dozen
full-resolution originals to a phone on mobile data — which is most guests.

**Where:** `src/app/invite/[slug]/`, `src/components/invite/`,
`src/design-system/components/PhotoFrame.tsx`,
`src/app/(marketing)/showcase/page.tsx`.

**Approach.**
1. Add Supabase Storage to `next.config.ts` `images.remotePatterns`
   (`wzwzeoqaaronnuvfzvxf.supabase.co`, path `/storage/v1/object/public/**`).
2. Swap `<img>` for `next/image`. **Width and height are already in the `assets`
   table** — `PhotoUploader` records them on upload, so you do not need to probe
   the files.
3. `priority` on the hero image only; `loading="lazy"` everywhere else.
4. Verify across all 12 themes — `PhotoFrame` has four variants (arch, scallop,
   circle, polaroid) and the arch uses a CSS mask that `next/image`'s wrapper
   div can break.

**Verify by measuring**, not by eye: compare `time_total` and `size_download` on
an invitation with photographs, before and after.

---

## 2. Donut chart for admin

`Charts.tsx` has `TrendChart` (multi-series line) and `BreakdownBars`
(horizontal bars). A donut is genuinely missing.

**Use it for composition of a whole** — invitations by status, revenue share by
plan. Not for ranking; the bars already do that better.

**Colour is not free here.** A donut needs a *categorical* palette, and the one
in `Charts.tsx` is only validated for two series. Before adding a third or
fourth slice, run the validator:

```bash
cd <dataviz skill dir> && node scripts/validate_palette.js "#a8324a,#2a78d6,…" --mode light --surface "#fffdf6"
```

The obvious brand pairing — maroon and green — fails at ΔE 2.1 for deuteranopia.
Do not eyeball it. Always label slices directly so identity never rests on colour
alone.

---

## 3. Logo, favicon, navbar icons — **done**

Shipped in `cad30ca` (mark, favicon, apple-touch-icon, header) and `070a74a`
(the default OG share card). The mark is a torana that also reads as an A; it
lives in `src/design-system/brand/`, `public/brand/*.svg`, `src/app/icon.svg`
and `src/app/apple-icon.tsx` — **four files that drift silently**, so change all
four together.

Nav items now carry icons (`NavItem.icon`) — a glyph in the bar, a ruled
medallion in the drawer. The drawer was opened and screenshotted at 390px in
headless Chromium on 8 Aug 2026 and renders correctly.

**Still unwatched by a human:** the scroll-reactive header surface, the drawer's
body scroll lock, and whether the skip link lands on `#main`. One thing looked
wrong in the screenshot and was left alone as out of scope: **the drawer's scrim
does not appear to dim the page behind it.** The element is rendered
(`fixed inset-0 bg-[var(--color-overlay)]` in `navigation.tsx`); tapping outside
still closes the menu, so it is a visual question, not a broken interaction.
Worth thirty seconds in a real browser.

---

## 4. Needs a decision from you, not code

**Themes table — decided and built, 9 Aug 2026.** The split is: the `themes`
table holds the *catalogue* (id, name, tier, tags, palette, `is_active`,
`sort_order`), and `src/themes/index.ts` keeps everything that decides how a
theme is drawn. Layout stayed in code because it is typed and asserted by
`theme-layout.spec.ts`; in jsonb it would be neither, and a bad row would reach
a guest's invitation instead of failing a build.

Two things follow that are easy to get wrong later:

- **Tier gates selection, never features.** What an invitation can *do* is its
  plan, in `entitlements.ts`. A paying customer who picks a free theme keeps
  everything they paid for.
- **The catalogue and the registry can drift**, and drift is silent both ways.
  `tests/unit/theme-catalogue.test.ts` is the guard. Add a theme to one, add it
  to the other.

**Testimonials.** This conflicts with `PROJECT-GRAPH.md` §5: the showcase
publishes a *sanitised clone* and deliberately never identifies the family.
Quoting someone by name needs its **own** consent — agreeing to be featured
anonymously is not agreeing to be quoted. Add a separate
`permissions.testimonial_consent` and a separate admin queue, or drop it.

---

## 4a. Testing is deferred — decided 9 Aug 2026

**Do not write or run tests, and do not build automation, until the feature set
is complete.** Testing happens in one pass at the end, across everything. This
is the owner's call, made 9 Aug 2026.

What that means in practice: the suites are still in the repo and still run
(`npx vitest run`, `npx playwright test`) — nothing was deleted, so nothing has
to be rebuilt later. They are simply not part of the loop right now. Verify work
by running it: load the page, drive the flow, read the response.

The trade is worth stating plainly so the last stage is not a surprise. Two of
the worst bugs found so far — the `/invite/[slug]` 500 and Keystatic deleting
content — were caught by running the thing, not by a test. But the e2e suite
would have caught the first one instantly, and it was skipped. When the final
testing pass happens, that is the gap it needs to close.

---

## 4b. Content editing — decided 9 Aug 2026

There is no editor and there should not be one until the round-trip is proven.
Keystatic was added and removed within a day: it silently deleted blocks on save
(details in `progress.md` § Known issues and `learning/CHANGELOG.md`). MDX in
`content/` is edited in a text editor.

If you revisit this, the bar is a save that produces an empty `git diff` on
every existing file, not an editor that opens them.

---

## 5. Smaller, safe wins

- **Look at the dashboard and admin signed in.** They were restyled on 8 Aug 2026
  — sticky header with an active-state nav, a ruled page header, a gold rail on
  the active admin row, invitation cards as a labelled `<dl>` — and it all
  typechecks and builds, but **nobody has seen it rendered while logged in.**
- **Route-level loading states.** `LoadingBlock` exists (the ring loader); only
  `/admin` and `/dashboard` have `loading.tsx`. Add to `/agent`, `/profile`,
  `/dashboard/[id]`.
- **README is stale.** Still claims payments are stubbed and links
  `/invite/swarnil-weds-prachi`, which no longer exists.
- **Comment pass** on older `src/design-system/` files. Newer code is commented
  to standard; the original component library is thin.

---

## Working rules that will save you time

- **Two agents share this checkout.** Build with `NEXT_DIST_DIR=.next-claude`.
  The symptom of collision is `Cannot find module for page: /x` across unrelated
  routes — it looks like broken code and is not.
- **Stage explicitly, never `git add -A`.** The other agent has work in flight.
  Committing their half-finished state is how work gets lost. This is also how a
  live API key got committed once.
- **Commits must be authored as `Amantrika`** — Vercel Hobby rejects any other
  author and fails the deploy.
- **After every migration**, regenerate types:
  `supabase gen types typescript --linked > src/lib/supabase/types.generated.ts`.
  Never edit the generated file.
- **Diagnose `security definer` failures under the caller's session**, not as
  postgres — otherwise an admin-only function raises "only an administrator" and
  hides the real error:
  `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>"}';`
- **Verify, do not assume.** A build passing is not the site working; a deploy
  reporting READY is not a page rendering. Two real bugs this session were caught
  only by hitting the thing afterwards.

Full list of hard-won gotchas: `PROJECT-GRAPH.md` §11.

---

## Suggested order

1. **Push §0a** — the guest invitation is down in production and the fix is
   sitting unpushed. Nothing else is worth doing first.
2. **Blockers §0** — you, in a dashboard. Everything else is decoration until
   the money works.
3. **Images §1** — largest user-visible win left.
4. **Donut §2** — small, once the palette is validated.
5. **Decisions §4** — then build.

And one habit, given how §0a happened: **run the e2e suite before committing
anything that touches a data path.** `npm run test:e2e` against a running dev
server via `E2E_BASE_URL=http://localhost:PORT` takes under two minutes and
would have caught a production outage the day it was introduced.
