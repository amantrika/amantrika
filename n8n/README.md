# n8n — retired, kept as porting reference

**Do not deploy this. There is nothing here to run.** The `docker-compose.yml`,
`DEPLOYMENT.md` and `SETUP.md` that used to sit beside this file were deleted on
8 Aug 2026. What remains is source material for a port that is in progress.

## Why it was retired

The workflows were well built — claim-before-send idempotency, hashed
recipients, dry-run, opt-out suppression — and the argument for them (an
operations layer, never touching product state) was coherent. It still lost on
four counts:

1. **CLAUDE.md §2.1** locks the product to one deployment and says to stop and
   re-read the line rather than propose a second service. The rule and the repo
   cannot be allowed to disagree.
2. **Two email paths.** The order receipt went through `sendEmail()`; these ten
   messages called `api.resend.com` directly from workflow JSON. Two places to
   get `EMAIL_FROM`, one-click unsubscribe and idempotency independently right.
3. **Untestable.** 56KB of logic in JSON is invisible to typecheck, lint and the
   e2e suite. The app now has 157 tests; none of them could reach any of this.
4. **Operationally.** A second deployment to host, upgrade, back up and monitor,
   for a one-developer product. If it stopped, nudges would stop silently.

## What was kept

Everything valuable, and it now lives in the app:

- **The `automation` schema** — ledger, `hash_email()`, `mask_email()`,
  `optouts`, `settings`, and the `stale_drafts` / `invite_expiry` views. It was
  already in `supabase/migrations/20260808041157_automation_ledger.sql`; it stays
  exactly where it is, still unexposed to PostgREST.
- **The SQL in `sql/`** — the candidate queries are the hard part and they were
  right. They are being moved into `security definer` functions
  (`supabase/migrations/20260808112317_cron_notifications.sql`).
- **The scheduler** is now `src/app/api/cron/[job]`, guarded by `CRON_SECRET`,
  scheduled in `vercel.json`, sending through `sendEmail()`.

## Port status

| Workflow | Ported to |
|---|---|
| 05 host — abandoned draft nudge | ✅ `src/lib/notifications/jobs/abandoned-draft.ts` |
| 01 owner — new signup alert | ⬜ |
| 02 owner — daily digest | ⬜ |
| 03 owner — partner application alert | ⬜ |
| 04 owner — stuck order sweeper | ⬜ |
| 06a host — first RSVP alert | ⬜ |
| 06b host — daily RSVP digest | ⬜ |
| 07 host — publish confirmation | ⬜ |
| 08 host — expiry warning / archive offer | ⬜ |
| 09 host — post-event wrap-up | ⬜ |
| 10 guest — event reminders | ⬜ |

Porting one is mechanical now that the substrate exists: move the query from
`sql/` into a `security definer` function, write a render function, add an entry
to `JOBS` in the cron route and a schedule to `vercel.json`. Delete this folder
when the table has no empty boxes left.

Two limitations were structural in the originals and remain so: there is no
`expired` value in `event_status`, so workflow 08 can only warn, and there is no
archive SKU, so its CTA has nowhere to point but the pricing page.
