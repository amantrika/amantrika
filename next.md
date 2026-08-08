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

## 0a. Push, before anything else

**`/invite/[slug]` and `/roadmap` are returning 500 on the live site**, and the
fix is committed but **not pushed** (`e6a76be`). Production deploys from
`n8n-automation-layer`, so `git push` is the deploy. Do that first and then load
an invitation to confirm — a READY deploy is not a rendering page.

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

One thing left, and it needs a browser: the header's scroll-reactive surface and
the mobile drawer have never been watched by a human or an agent. The Chrome
extension was not connected in either session. Open the site on a phone-width
window and check the drawer's scrim, the scroll lock, and that the skip link
lands on `#main`.

---

## 4. Needs a decision from you, not code

**Themes table.** You asked for themes in the database. `src/themes/index.ts`
currently holds TypeScript types, React motif components and per-theme layout
objects — **none of which survive a database round trip**. The real question is
what belongs in a table (name, palette, tags, active flag) versus what stays in
code (components, layout). Guessing wrong means migrating back. Decide the split
before anyone writes the migration.

**Testimonials.** This conflicts with `PROJECT-GRAPH.md` §5: the showcase
publishes a *sanitised clone* and deliberately never identifies the family.
Quoting someone by name needs its **own** consent — agreeing to be featured
anonymously is not agreeing to be quoted. Add a separate
`permissions.testimonial_consent` and a separate admin queue, or drop it.

---

## 5. Smaller, safe wins

- **Route-level loading states.** `ShehnaiLoadingBlock` exists; only `/admin` and
  `/dashboard` have `loading.tsx`. Add to `/agent`, `/profile`, `/dashboard/[id]`.
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
