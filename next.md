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

## 3. Logo, favicon, navbar icons

Self-contained, visual, and asked for repeatedly. Nothing blocks it.

- Wordmark + icon. `src/design-system/icons/index.tsx` has 32 wedding icons
  already — `shehnai`, `toran`, `mandap`, `lotus` are the plausible marks.
- Favicon set + `apple-touch-icon` + OG image, wired in `src/app/layout.tsx`
  metadata and replacing `src/app/favicon.ico`.
- Icons beside nav items in `src/components/site/SiteChrome.tsx`. The admin
  sidebar already does this — match it.

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

1. **Blockers §0** — you, in a dashboard. Everything else is decoration until
   the money works.
2. **Images §1** — largest user-visible win left.
3. **Logo & icons §3** — visible, self-contained, no dependencies.
4. **Donut §2** — small, once the palette is validated.
5. **Decisions §4** — then build.
