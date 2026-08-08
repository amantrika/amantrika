# Setup — getting the first workflow running

For an n8n instance you already have (`n8n.imswarnil.com`). About 30 minutes.

This guide gets **one** workflow live end to end: *01 — new signup alert*, which pings you when
someone signs up. Once that works, the other ten are the same three steps repeated, and the last
section covers them.

`DEPLOYMENT.md` is about *where to run n8n* — you already have that solved, so ignore it.

---

## First: why is there a `sql/` folder?

Because a workflow's query is easier to read as a file than as an escaped string inside JSON.

**You never run anything in `n8n/sql/` by hand.** Each workflow JSON already contains its own query
embedded inside it — importing the workflow brings the SQL with it. The `sql/` folder is the same
text kept readable, with the reasoning in comments, so you can review or edit a 60-line query
without fighting JSON escaping. If you change one, change both.

There is exactly **one** SQL file you actually run, once, and it is not in that folder:
`supabase/migrations/20260808041157_automation_ledger.sql`. That's step 1 below.

**And on "I thought we were using Supabase" —** we are. Supabase *is* a Postgres database, with
auth and storage and a dashboard wrapped around it. When n8n asks for a "Postgres" credential, that
is how you connect to Supabase. There's also an n8n node called "Supabase" which we deliberately do
not use: it talks to the REST API, which cannot run the aggregations and the
`insert … on conflict … returning` that make these workflows safe to re-run.

---

## Step 1 — Create the ledger table

From the repo root:

```bash
supabase db push
```

This adds an `automation` schema: a send ledger, an opt-out table, settings, and two views. It is
additive — no existing table is modified, and it drops nothing.

Confirm it worked (Supabase dashboard → SQL Editor):

```sql
select count(*) from automation.notifications;   -- 0
select * from automation.settings;               -- 6 rows
select count(*) from automation.stale_drafts;    -- however many drafts you have
```

If those three run, step 1 is done. **This is what makes the workflows safe to re-run** — the
ledger is how a workflow knows it already emailed someone.

---

## Step 2 — Nothing. Config lives in the workflow

There is no environment setup. Every workflow carries a **Config** node on the left of its canvas,
holding the eight values it needs:

| Key | Value |
|---|---|
| `AMANTRIKA_SITE_URL` | `https://amantrika.com` |
| `AMANTRIKA_EMAIL_FROM` | `Amantrika <onboarding@resend.dev>` |
| `AMANTRIKA_OWNER_EMAIL` | `theamantrika@gmail.com` |
| `AMANTRIKA_DRY_RUN` | `true` — **nothing sends while this is true** |
| `AMANTRIKA_WA_PHONE_NUMBER_ID` | empty until you set up WhatsApp |
| `AMANTRIKA_OWNER_WHATSAPP` | empty until you set up WhatsApp |
| `AMANTRIKA_WA_TEMPLATE` | `amantrika_ops_alert` |
| `AMANTRIKA_UNSUBSCRIBE_MAILBOX` | `unsubscribe@amantrika.com` |

Click the node, edit a value, save. No container access, no restart, no admin rights.

This design was forced by your instance and is better anyway: `$env.*` needs container access you do
not have as a member, and n8n Variables are licensed off (`/api/v1/variables` returns 403 here).

> **`onboarding@resend.dev` is Resend's shared sender and only delivers to the address that owns the
> Resend account.** Perfect for the owner workflows (01–04), where you are the only recipient.
> Before the customer-facing ones (05–10) go live, verify a real domain in Resend and change
> `AMANTRIKA_EMAIL_FROM` in each Config node — otherwise those emails silently go nowhere.

---

## Step 3 — The Postgres credential

n8n → **Credentials → New → Postgres**. Name it **exactly**:

```
Amantrika Supabase (Postgres)
```

The name matters — the workflow JSON looks the credential up by name. A typo means every node shows
"credential not found".

| Field | Value |
|---|---|
| Host | `aws-0-ap-southeast-1.pooler.supabase.com` |
| Port | `5432` |
| Database | `postgres` |
| User | `postgres.wzwzeoqaaronnuvfzvxf` |
| Password | your Supabase **database** password |
| SSL | **require** |

Three things that catch people:

- The user is `postgres.wzwzeoqaaronnuvfzvxf`, **not** plain `postgres`. The pooler needs the
  project ref appended. This is the most common failure.
- The password is your *database* password — not the anon key, not the service-role key. Find it at
  **Supabase → Project Settings → Database**. If you never saved it, use *Reset database password*
  there; it does not affect your app, which authenticates with keys rather than this password.
- Port **5432** (session pooler), not 6543. The claim statement is a CTE containing a write, and
  transaction pooling on 6543 handles that badly.

Hit **Test connection**. Do not continue until it is green.

> **On your member account:** whoever creates a credential owns it. If `theamantrika@gmail.com`
> creates the credentials and also owns the workflows, everything just works. If a different account
> imports the workflows, share the credentials with it, or the nodes will not resolve.

---

## Step 4 — The Resend credential

**Credentials → New → Header Auth**, named exactly:

```
Resend API
```

| Field | Value |
|---|---|
| Name | `Authorization` |
| Value | `Bearer re_...` (from [resend.com/api-keys](https://resend.com/api-keys)) |

### Also create a placeholder WhatsApp credential

Workflow 01 tries WhatsApp first and falls back to email automatically. But n8n will not execute a
node whose credential does not exist at all, so create a dummy one so the fallback can happen:

**Credentials → New → Header Auth**, named exactly `Meta WhatsApp Cloud`, Name `Authorization`,
Value `Bearer placeholder`.

That call will fail — which is exactly what you want to see. The failure routes to the email
fallback, and you get the alert in your inbox. Real WhatsApp setup is in `DEPLOYMENT.md` and can
wait indefinitely.

---

## Step 5 — Open workflow 01

**All eleven workflows are already on your instance**, pushed via the API and inactive. Open
**Amantrika · 01 Owner — new signup alert**.

Fourteen nodes:

```
Every 10 minutes → Config → Find new signups → Render alert → Claim in ledger → New only → Dry run?
                                                                                    ├ Mark skipped
                                                                                    └ Alert owner on WhatsApp
                                                                                        ├ Mark sent
                                                                                        └ Fall back to email → Mark sent
```

Open **Find new signups** and **Claim in ledger** and confirm each shows the Postgres credential
rather than a red warning. If they are red, the credential name does not match character for
character.

---

## Step 6 — Dry run it

Click **Execute Workflow** (bottom centre).

### If "Find new signups" returns 0 items

That is correct behaviour, not a bug — it only looks at the last 24 hours. Either sign up a throwaway
account on your site, or widen the window temporarily: open the node and change

```sql
where p.created_at > now() - interval '24 hours'
```

to `interval '365 days'`, run it, then **change it back**.

### What you should see

Green ticks through to **Mark skipped (dry run)**. Nothing is sent — `AMANTRIKA_DRY_RUN` is still
`true`. Now read what it *would* have sent (Supabase SQL Editor):

```sql
select kind, status, payload ->> 'subject' as subject, payload ->> 'whatsapp' as whatsapp
from automation.notifications
order by claimed_at desc;
```

You should see one row per signup, `status = 'skipped'`, with a real subject line. To check the
layout, copy the HTML into a file and open it in a browser:

```sql
select payload ->> 'html' from automation.notifications order by claimed_at desc limit 1;
```

**A dry run is a proofreading pass, not just a smoke test.** This is where you fix the wording.

---

## Step 7 — Prove it will not email twice

This is the most important check here, and it takes ten seconds.

```sql
select count(*) from automation.notifications;   -- note the number
```

Click **Execute Workflow** again. Then:

```sql
select count(*) from automation.notifications;   -- must be IDENTICAL
```

The candidate query still finds the signups, but **Claim in ledger** returns `did_claim = false` for
each and **New only** drops them. If the number went up, stop and tell me — something is wrong with
the ledger and no other workflow should be activated.

---

## Step 8 — Go live

```sql
delete from automation.notifications where status = 'skipped';
```

Open the **Config** node, set `AMANTRIKA_DRY_RUN` to `false`, save, and **Execute Workflow** once
more. No restart — that is the point of the Config node.

Expected: **Alert owner on WhatsApp** goes red (the placeholder token), the run continues down the
error branch to **Fall back to email**, and the alert lands in `theamantrika@gmail.com`.

That red node is the design working. Confirm in the ledger:

```sql
select kind, status, payload -> 'channel' as channel, sent_at
from automation.notifications order by claimed_at desc limit 5;
```

`status = 'sent'`. Now toggle the workflow **Active** — it runs every 10 minutes from here.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `password authentication failed` | User must be `postgres.wzwzeoqaaronnuvfzvxf`, not `postgres` |
| `no pg_hba.conf entry` / SSL error | SSL must be `require` |
| Every query returns 0 rows, always | Connected as a role that does not bypass RLS. Use the `postgres` user |
| Emails addressed to `undefined` | A Config value is blank, or the node was renamed away from `Config` |
| `credential not found` | Credential name is not character-for-character as listed above |
| Resend 403 `domain not verified` | Send only to your own address, or verify a domain |
| Ledger count grows on re-run | Stop. The migration may not have applied. Check `automation.notifications` has a unique index on `dedupe_key` |
| Rows stuck at `status = 'claimed'` | A run died between claiming and sending. `delete` the row to let it resend |

---

## Then the rest

Same three steps each: import, dry-run twice, activate. Order matters — blast radius grows as you go
down.

**Now** (only you receive anything):

| | Workflow |
|---|---|
| 02 | Daily digest, 09:00 IST |
| 03 | Partner application alert |
| 04 | Stuck order sweeper — **the highest-value one here.** It catches a customer who paid while their invitation stayed unpublished. Nothing else in the system detects that |

**After you verify a Resend sending domain** (these reach real customers, so the placeholder sender
is not good enough):

| | Workflow |
|---|---|
| 07 | Publish confirmation & share kit |
| 06a / 06b | First RSVP, then the daily digest |
| 09 | Post-event wrap-up |

**Last**, and ideally after a real `/unsubscribe` route exists, because these are the high-volume
ones and a `mailto:` unsubscribe does not scale:

| | Workflow |
|---|---|
| 05 | Abandoned draft nudge — five emails per host |
| 08 | Expiry warning & archive offer |
| 10 | Guest reminders — the only one that emails *guests* |

Each workflow carries a sticky note on its canvas explaining what it does and why. `README.md` has
the design and the runbook queries.
