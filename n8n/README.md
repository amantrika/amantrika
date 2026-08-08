# n8n automation layer

Ten workflows that fill the gap between what `project-overview.md` §14, §15, §18 and §21 describe
and what the app actually does today. Before this folder existed, the entire codebase sent exactly
one email — the order-paid receipt in `src/app/api/payments/webhook/route.ts` — and had no cron
routes at all.

## What this is, and what it is deliberately not

`project-overview.md` §2.1 locks the product to one Next.js app, one Supabase project, one
deployment: *"If you ever find yourself proposing a second service, stop and re-read this
paragraph."* n8n is a bounded exception to that, and it stays bounded by being an **operations
layer, not a product service**:

- It reads Supabase over Postgres and writes only to its own `automation` schema.
- It never serves a request path, and nothing on `/invite/[slug]` depends on it.
- It never changes product state. It does not publish invitations, settle orders, approve partners,
  or record showcase consent — those all stay in the app, behind auth, where they can be audited.
- If n8n is down, the product works. Hosts just don't get nudged.

The one thing it owns is *when to say something to whom, and having said it once, never saying it
again.*

---

## Setup

### 1. Apply the migration

```bash
supabase migration up          # local
supabase db push               # linked project
npm run types:generate         # or the repo's regenerate script
npx tsc --noEmit
```

`supabase/migrations/20260808041157_automation_ledger.sql` creates the `automation` schema:
`notifications` (the send ledger), `optouts`, `settings`, two derived views, and two helper
functions. It touches no existing table except to add two partial indexes on `events`.

The `automation` schema will **not** appear in `src/lib/supabase/types.generated.ts`. That is
intentional — it is out of PostgREST's reach, so no anon or authenticated role can see it even by
accident, and the app cannot take a dependency on operational state.

### 2. Credentials in n8n

Create these three with **exactly these names** — the workflow JSON references them by name.

| Name | Type | Value |
|---|---|---|
| `Amantrika Supabase (Postgres)` | Postgres | Supabase → Project Settings → Database → Connection string. Use the **session pooler** (port 5432) host, not the transaction pooler; the claim statement uses a CTE that transaction pooling handles poorly under load. |
| `Resend API` | Header Auth | Name `Authorization`, Value `Bearer re_...` |
| `Meta WhatsApp Cloud` | Header Auth | Name `Authorization`, Value `Bearer <permanent access token>` |

The Postgres user needs to bypass RLS to read `events`, `profiles`, `orders` and friends. The
`postgres` superuser does. A restricted role would return empty result sets and every workflow
would silently find nothing — which is exactly the failure mode the `admin_overview()` note below
warns about, so prefer being explicit here.

### 3. Environment

Copy `n8n/.env.example` into your n8n instance's environment. n8n also needs:

```
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```

Without it, `$env.*` in expressions returns undefined and every workflow will try to email
`undefined`. This is the single most common setup mistake.

### 4. Import

Import all eleven files from `workflows/`. They arrive **inactive** — leave them that way until
you have run the dry-run pass below.

---

## Dry run — do this before activating anything

Every workflow has an `AMANTRIKA_DRY_RUN` switch. When it is `true`, the send node is bypassed and
the ledger row is closed as `skipped` with the **fully rendered email in `payload`**. A dry run is
therefore a proofreading pass, not just a smoke test.

```
AMANTRIKA_DRY_RUN=true
```

1. Execute each workflow manually. Check the candidate count looks sane.
2. Read what it would have sent:

```sql
select workflow, kind, status, payload -> 'subject' as subject
from automation.notifications
where status = 'skipped'
order by claimed_at desc;

-- Render one in a browser to check the layout:
select payload ->> 'html' from automation.notifications where id = '<uuid>';
```

3. **Run every workflow a second time and assert zero new rows.** This is the idempotency proof and
   the most important check here:

```sql
select count(*) from automation.notifications;   -- must be unchanged
```

4. Clear the dry run and go live on the owner workflows first:

```sql
delete from automation.notifications where status = 'skipped';
```

```
AMANTRIKA_DRY_RUN=false
```

Activate 01 and 02 only. Confirm WhatsApp delivery. Then temporarily break the WhatsApp credential
and confirm the alert still arrives by email — that fallback is the reason the owner workflows have
two send paths, and it is worth proving rather than assuming.

---

## How a workflow is built

All eleven have the same spine, so learning one teaches you all of them.

```
Schedule → Find candidates (SQL) → Render (Code) → Claim in ledger → New only → Dry run?
                                                                                 ├ true  → Mark skipped
                                                                                 └ false → Send → Mark sent
                                                                                                └ error → Mark failed
```

**Claim before send.** The claim node runs
`insert … on conflict (dedupe_key) do nothing returning id`. If it gets a row back, this run owns
the send. If not, someone already handled it and the item is dropped. The unique index on
`dedupe_key` arbitrates overlapping schedules, a second n8n instance, and a manual "Execute
Workflow" click during a scheduled run — all for free.

The same `dedupe_key` is passed to Resend as an `Idempotency-Key`, which covers the one remaining
window: a retry landing between the claim and a successful send.

**Failures are not retried.** A row left at `failed` is not picked up on the next schedule. A failed
nudge is not worth a retry storm. Delete the row by hand to force a resend.

**Recipients are never stored.** The ledger holds `automation.hash_email(address)`, never the
address (CLAUDE.md rule 12). The claim query returns the address in its result set so the send node
has something to send to, but it is deliberately not a column. Owner alerts go one step further:
`automation.mask_email()` redacts in SQL, so the raw address never leaves Postgres on that path at
all.

**The SQL lives twice.** `n8n/sql/*.sql` is the readable source of truth with all the reasoning in
comments; the same query is embedded in the workflow JSON so the export is self-contained. If you
change one, change both.

---

## The workflows

| # | File | Runs | What it does |
|---|---|---|---|
| 01 | `01-owner-new-signup-alert` | 10 min | Someone signed up — with referral attribution, so you can tell organic from partner-driven |
| 02 | `02-owner-daily-digest` | 09:00 IST | Yesterday's numbers, standing totals, and what needs a decision |
| 03 | `03-owner-partner-application-alert` | 15 min | A partner applied. Once per application, no nagging |
| 04 | `04-owner-stuck-order-sweeper` | 30 min | **Paid but not published.** See below |
| 05 | `05-host-abandoned-draft-nudge` | hourly | The §15 five-email drip, gated on completion score |
| 06a | `06a-host-first-rsvp-alert` | 10 min | The first response — the moment the product becomes real |
| 06b | `06b-host-daily-rsvp-digest` | 20:00 IST | Only on days with real movement |
| 07 | `07-host-publish-confirmation-share-kit` | 10 min | Link, QR, pre-filled WhatsApp message |
| 08 | `08-host-expiry-warning-archive-offer` | 10:00 IST | 7d, 1d, then the archive offer |
| 09 | `09-host-post-event-wrapup` | 10:30 IST | Stats recap, showcase ask, review request |
| 10 | `10-guest-event-reminders` | 09:00 IST | 7d and 1d, to guests who said yes |

Each workflow carries a sticky note in the canvas with its own reasoning. Three are worth reading
here because they encode non-obvious facts about this codebase.

### 04 is the one that earns its keep

Two populations look identical in the `orders` table:

- **critical** — a verified `payment.succeeded` sits in `payment_events`, but the order is still
  `pending`. The webhook took the money and did not publish. A paying customer is holding an
  invitation they cannot share. **Nothing else in the system detects this** — the webhook only
  `log.warn()`s, which goes to PostHog, which nobody watches at 2am. Alerts immediately.
- **info** — pending with no webhook delivery at all. An abandoned checkout, i.e. normal commerce.
  Claimed and closed silently; the daily digest carries the count. Alerting on these would train
  you to ignore the channel.

### 02 does not use `admin_overview()`

`admin_overview()` and `admin_daily_series()` are `security invoker` and gate internally on
`is_admin()`, which reads `auth.uid()`. Over a direct Postgres connection `auth.uid()` is null, so
both return **zeros rather than raising**. A silently wrong digest every morning is worse than no
digest, so 02 uses plain SQL. Do not "simplify" it back to the RPCs.

### 07 knows there are two publish paths

- **paid** — the webhook settles, publishes, and sends a receipt. These hosts already heard from
  us, so 07 sends the *sharing kit only*. A second confirmation would read as a double charge.
- **free** — `src/app/onboarding/actions.ts` publishes inline; the webhook never runs, so these
  hosts currently receive **nothing at all**. They get the full confirmation.

The free plan is watermarked and emits no `og:image` by design (`src/lib/entitlements.ts`), so the
free copy does not promise a rich WhatsApp preview it will not deliver.

---

## WhatsApp

Owner alerts go to **your own number** over the official Meta Cloud API, with an automatic fallback
to email if the call fails for any reason. Nothing else in this folder touches WhatsApp.

Guest messaging is email plus deep links only. `project-overview.md` §18 is explicit: *"respect
WhatsApp's terms; do not build an unofficial automation."* The `https://wa.me/?text=…` link in
workflow 07 is a deep link that opens the host's own WhatsApp with a message ready — it sends
nothing by itself, which is the permitted pattern.

**Setup.** You need a Meta Business account, a WhatsApp Business Account, a phone number ID, and an
**approved message template**. Create a template named `amantrika_ops_alert`, category *Utility*,
with a single body variable:

```
Amantrika: {{1}}
```

Template body parameters cannot contain newlines or long runs of spaces, which is why every render
node produces a separate single-line `whatsapp` string alongside the HTML. Session (non-template)
messages would be rejected outright — an alert routinely arrives long after the 24-hour
customer-service window has closed.

**Until the template is approved, do nothing.** Every owner workflow falls back to email
automatically on a WhatsApp failure, so they are useful on day one.

---

## Known limitations

These are structural, not oversights. Each needs an app change to resolve.

**Nothing ever expires.** `event_status` is `('draft','published','archived')` — there is no
`expired` value. Workflow 08 warns and mutates nothing. Adding the status changes what
`/invite/[slug]` renders and belongs in an app phase.

**There is no archive SKU.** `plans` holds `free`/`classic`/`premium` only, so 08's CTA links to
`/pricing#archive` rather than opening a checkout. §14 calls this "the easiest margin in the
product" — it needs a `plans` row and a Dodo product id before it can earn anything.

**No resume tokens.** §15 specifies a single-use 30-day `resume_token` → `/resume/[token]` that
signs the host in at the exact block. That route does not exist, so workflow 05 links to
`/onboarding?resume=<event_id>` behind normal auth. The 72-hour email is also supposed to embed a
rendered image of the host's actual invitation; it links to the live preview instead.

**Unsubscribe is a mailto.** There is no `/unsubscribe` route, so host and guest emails use RFC
8058's `mailto:` form and you insert into `automation.optouts` by hand. A small signed-token route
in the app would fix this properly — it is the highest-value follow-up in this list, because the
volume workflows (05, 08, 10) all depend on it being real.

**Completion score and expiry are derived, not stored.** `automation.stale_drafts` computes a score
from which fields are filled, weighted by what a host actually has to decide — a cover photo and a
date are real commitment, a hashtag is not. `automation.invite_expiry` derives `expires_at` as
`main_datetime + 30 days`. Both are stand-ins for spec'd columns and both live in one view each, so
replacing them later is a one-file change.

**`EMAIL_FROM` is a placeholder.** `src/lib/env.ts` defaults to `onboarding@resend.dev`, which only
delivers to the Resend account owner. Verify a sending domain before activating 05–10, or every
customer email silently goes nowhere.

**Prices are not quoted.** `project-overview.md` §25.1 says every price in the spec is a
placeholder and §25.8 leaves the free tier undecided; early-bird is disabled behind
`PRICING_EARLY_BIRD`. So the copy names plans and links to `/pricing` rather than hardcoding
amounts. Once §25.1 lands, workflows 05 and 08 are the two whose copy gets stronger for it.

**Workflow 07 fetches a QR from `api.qrserver.com`.** The only third-party call in this folder. To
drop it, delete the `qr` line in that workflow's render node.

---

## Runbook

```sql
-- Stranded between claim and send. Anything here for over an hour means a
-- workflow died mid-run. Investigate before deleting — deleting makes it resend.
select id, workflow, kind, subject_id, claimed_at, error
from automation.notifications
where status = 'claimed' and claimed_at < now() - interval '1 hour'
order by claimed_at;

-- What went out yesterday.
select workflow, kind, status, count(*)
from automation.notifications
where claimed_at > now() - interval '1 day'
group by 1, 2, 3 order by 1, 2;

-- Failures, with the provider's reason.
select workflow, kind, error, claimed_at
from automation.notifications
where status = 'failed' order by claimed_at desc limit 50;

-- Force a resend of one message.
delete from automation.notifications where dedupe_key = 'nudge:<event_id>:draft_72h';

-- Opt someone out by hand (until the /unsubscribe route exists).
insert into automation.optouts (recipient_hash, scope, note)
values (automation.hash_email('someone@example.com'), 'all', 'replied asking to stop');

-- Retune cadence without re-importing any workflow.
update automation.settings set value = '8' where key = 'rsvp_digest_threshold';
select * from automation.settings;
```

## Layout

```
n8n/
  README.md          this file
  .env.example       the n8n-side environment contract
  sql/               every query, with the reasoning in comments
    00-ledger-helpers.sql   claim / confirm / fail, and the runbook
    01..10-*.sql            one candidate query per workflow
  workflows/         importable n8n exports, one per workflow
```
