# wont-do.md

Things deliberately **not** built, and why. Everything here was considered and
skipped on purpose — none of it was forgotten. If you disagree with a line,
delete it and move the item into `plan.md`.

Two categories: **won't do** (a decision against it) and **not now** (right
idea, wrong moment, with the trigger that should change our mind).

Last updated 8 Aug 2026.

---

## Won't do

### A second service, a queue, or a background worker
One Next.js app, one Supabase project, one deployment. Every lifecycle job —
nudges, expiry, archive offers — is a Vercel Cron hitting a route. If something
here ever seems to need a worker, the design is wrong, not the constraint.

### Self-hosted email (own SMTP / Postfix)
Genuinely third-party-free, and genuinely worse. Vercel is serverless with
outbound port 25 blocked, so it would mean a separate VPS, a dedicated clean IP,
PTR/rDNS, SPF, DKIM, DMARC, bounce and complaint handling, and weeks of IP
warm-up — with Gmail and Outlook spam-foldering new senders by default. Our mail
is payment receipts and "your invitation is live" links; if those land in spam,
hosts think the product broke. We use Resend, behind `sendEmail()`, so swapping
provider is ~30 lines in one file.

### An unbreakable watermark
`src/lib/watermark.ts` makes removal cost more than the upgrade: per-request
nonces, no shared class or tag, one mark in the document flow. It does not try
to be uncircumventable, because against markup we ship to the client that is not
achievable. A determined person with dev-tools will win, and that is an accepted
loss, not a bug.

### Client-side entitlement checks of any kind
Entitlements resolve on the server from `events.plan_code`, which only the
payment webhook writes. There will be no "is this user premium?" hook in the
browser, ever.

### An in-app test dashboard
Test results live in Playwright's HTML report (`npm run test:report`), not in a
page inside the product. A results page inside the app is another surface to
maintain and is only ever as fresh as the last run.

### Fabricated content of any kind
No invented testimonials, no template partner logos, no placeholder Lorem, no
sample "as seen in" badges. An empty section beats a fake one. This is why the
showcase ships with real consented invitations or not at all.

### `getOrderStatus()` reconciliation UI
The provider interface implements it and nothing calls it. The order row is the
truth, written by the webhook, and the dashboard polls that. It stays as a
support and reconciliation tool, not a product surface.

---

## Not now

### The `/i/[slug]` rename and the whole Phase 0 rename map
`events→invites`, `sub_events→invite_events`, `rsvps→invite_rsvps`,
`agents→partners`, `/invite/[slug]→/i/[slug]`. Correct, and untouched here
because it rewrites every route, query and generated type at once — which would
have collided with the payments and watermark work in the same session.
**Trigger:** do it as its own session, before the builder rewrite, with the 301s
from `/invite/[slug]` and `invite.amantrika.com` landing in the same commit so
circulating guest links never 404.

### The early-bird discount ladder
Implemented and unit-tested in `src/lib/pricing.ts`, switched off behind
`PRICING_EARLY_BIRD`. Forty percent off a placeholder price is not a discount,
it is a guess. **Trigger:** real list prices are decided (plan.md §E item 2).

### pgTAP
Vitest and Playwright are in. Database-level tests are not, and the RLS
assertions that matter — anon can read no drafts, no RSVPs, no guest lists —
are currently only covered indirectly through the app. **Trigger:** the Phase 1
schema work, since that is when the policies get re-cut anyway.

### CI (GitHub Actions)
`./scripts/test.sh` runs everything locally and is what CI would call. No
workflow file yet. **Trigger:** the first time someone other than you pushes, or
the first regression that reaches production.

### Live Dodo payments
The integration is complete and exercised end to end, but only against a
test-mode key: test and live are separate businesses with separate catalogues.
**Trigger:** business verification with Dodo completes and a live key exists;
then set `DODO_ENVIRONMENT=live_mode` and re-run `npm run test:e2e`.

### React Email templates and the nudge sequence
`sendEmail()` sends real mail today, with hand-written HTML and a plain-text
twin for the one message that exists (the payment receipt). The template system,
the `invite_nudges` ledger, the 72-hour email with a rendered preview, and
one-click unsubscribe are all still to build. **Trigger:**
`amantrika.imswarnil.com` is verified in Resend — until then no lifecycle email
can reach a real customer anyway.

### Status branching beyond draft/published
The spec has draft, preview, published, expired and archived. We have draft and
published, plus the watermark that `preview` was mostly there to express.
**Trigger:** the expiry and archive crons, which are what make the other states
mean anything.

### Multi-language anything
No `invite_translations`, no `/i/{slug}/{lang}`, no hreflang, no script-aware
font loading. Deliberately untouched: it reshapes the content model, and the
content model has not been settled yet (Phase 1's Zod schema). **Trigger:** the
content schema lands, and the "which languages ship first" decision is made.

### Dynamic OG images
`next/og` images for blog posts and paid invitations. Watermarked invitations
deliberately emit none, and that part is done and tested — the paid-tier image
is what is missing. **Trigger:** any time; it is self-contained.

### Rich Results validation
The JSON-LD suite is built and every page's structured data is asserted to parse
in `tests/e2e/marketing.spec.ts`. Nobody has run Google's Rich Results Test
against it, which is the check that catches semantically-wrong-but-valid JSON.
**Trigger:** before launch.

### The Mongo → Postgres migration
`scripts/migrate/` does not exist. Assumed no production data to preserve
(plan.md §E item 1) — **this assumption has never been confirmed**, and it is
the single cheapest thing on this page to get wrong. Confirm it.

---

## Known gaps that are nobody's decision — just unfinished

- **Legal pages** (terms, privacy, refund policy) are not migrated. Refund
  policy in particular is a prerequisite for taking real money.
- **Pricing page** does not exist; blocked on real prices.
- **The six known content bugs** from plan.md §50 are unfixed, including the
  dead contact form and the dead newsletter form — both currently render and
  submit nowhere.
- **`ALLOW_MOCK_PAYMENTS` is not covered by a test.** The e2e suite sets it to
  reach the mock checkout, so the guard that hides it in production is asserted
  by reading the code, not by running it.
- **`auth.admin.listUsers()` errors on the Supabase project**
  ("Database error finding users count"). Test teardown works around it by
  finding users through `profiles`. Root cause unknown.
