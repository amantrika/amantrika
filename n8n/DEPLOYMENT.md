# Getting n8n live

## First: n8n cannot run on Vercel

This is the most important thing on this page, so it goes first.

Vercel runs **serverless functions**: a request comes in, a function wakes up, it answers, it dies.
There is no process between requests. n8n is the opposite — a **long-lived server** that holds a
scheduler in memory, keeps its own Postgres database of executions and credentials, and must be
awake at 03:30 to fire the daily digest whether or not anyone visited your site.

Concretely, on Vercel n8n would have:

- no persistent process, so no schedule would ever fire
- no writable disk, so credentials and workflow state would vanish
- a hard execution timeout, so a 500-guest reminder run would be killed mid-way
- no way to serve its editor UI

So n8n lives **somewhere else**, and reaches into your Supabase database over the internet. Your
Next.js app stays on Vercel and is completely unaware n8n exists. That separation is the whole
design — see "What this is, and what it is deliberately not" in `README.md`.

If you would rather not run a second thing at all, skip to [The alternative](#the-alternative-no-n8n-at-all)
at the bottom. It is a legitimate choice and arguably the one your own spec prefers.

---

## Where to run it

| Option | Cost | Effort | Good for |
|---|---|---|---|
| **n8n Cloud** | from ~€20–24/mo | 5 minutes, zero ops | **Start here.** Backups, upgrades and uptime are someone else's problem |
| **Railway** | ~$5–10/mo | ~20 minutes | You want control and a real deploy pipeline, without a server to patch |
| **Render** | ~$7/mo + disk | ~20 minutes | Same as Railway, pick on preference |
| **Fly.io** | ~$3–5/mo | ~30 minutes | Cheapest managed-ish option; needs a volume and a little CLI work |
| **Hetzner / DigitalOcean VPS** | ~€4–6/mo | ~1 hour + ongoing | Cheapest at scale, but you own security updates forever |
| Your Mac | free | — | **Don't.** A laptop that sleeps misses every scheduled run, silently |

My recommendation: **n8n Cloud for the first month.** These ten workflows send a handful of emails a
day. The entire value is in them running reliably at 09:00 without you thinking about it, and that
is precisely what you are buying. Move to Railway or a VPS later if the bill starts to annoy you —
the workflow JSON is portable, so migrating is an export and an import.

---

## Option A — n8n Cloud (recommended)

1. Sign up at [n8n.io](https://n8n.io) and create an instance.
2. **Settings → Environment variables**, add everything from `n8n/.env.example`. Start with
   `AMANTRIKA_DRY_RUN=true`.
   - On n8n Cloud, `$env` access in expressions is enabled by default, so you do **not** need
     `N8N_BLOCK_ENV_ACCESS_IN_NODE`. On every self-hosted option below, you do.
3. Create the three credentials (§ Credentials below).
4. **Workflows → Import from File**, one file at a time, all eleven from `n8n/workflows/`.
5. Run the dry-run pass in `README.md`.
6. Activate.

Your Supabase database must accept connections from n8n Cloud. Supabase is open to the internet by
default, so this normally just works. If you have enabled network restrictions, allowlist n8n
Cloud's egress IPs.

---

## Option B — Railway

1. New Project → **Deploy from Docker image** → `n8nio/n8n:latest`.
2. Add a **Volume** mounted at `/home/node/.n8n`. Without it, every redeploy wipes your credentials.
3. Add a **Postgres** service. n8n stores its own execution history there — this is *not* your
   Amantrika database and must not point at it.
4. Set variables:

```
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=${{Postgres.PGHOST}}
DB_POSTGRESDB_PORT=${{Postgres.PGPORT}}
DB_POSTGRESDB_DATABASE=${{Postgres.PGDATABASE}}
DB_POSTGRESDB_USER=${{Postgres.PGUSER}}
DB_POSTGRESDB_PASSWORD=${{Postgres.PGPASSWORD}}

N8N_HOST=<your-app>.up.railway.app
N8N_PROTOCOL=https
WEBHOOK_URL=https://<your-app>.up.railway.app/
GENERIC_TIMEZONE=Asia/Kolkata
TZ=Asia/Kolkata

N8N_ENCRYPTION_KEY=<openssl rand -hex 32>
N8N_BLOCK_ENV_ACCESS_IN_NODE=false

N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<a real password>
```

Then everything from `n8n/.env.example`.

**`N8N_ENCRYPTION_KEY` matters.** It encrypts your stored credentials. Generate it once, save it in
your password manager, and never change it — if you lose it, every credential has to be re-entered.

**`GENERIC_TIMEZONE` matters too.** All schedules in these workflows are written in **UTC** with the
IST equivalent in the node name (`03:30 UTC (09:00 IST)`). Setting the timezone makes the n8n UI
agree with reality, but the cron expressions themselves are already correct.

5. Expose the service, open the URL, finish setup, then credentials → import → dry run.

---

## Option C — Your own server (Hetzner, DigitalOcean, EC2)

`docker-compose.yml` in this folder is ready to use.

```bash
scp -r n8n/ you@your-server:/opt/amantrika-n8n
ssh you@your-server
cd /opt/amantrika-n8n
cp .env.example .env && nano .env      # fill everything in
openssl rand -hex 32                    # paste into N8N_ENCRYPTION_KEY
docker compose up -d
docker compose logs -f n8n
```

Then put Caddy or nginx in front for TLS. With Caddy it is two lines:

```
n8n.amantrika.com {
  reverse_proxy localhost:5678
}
```

Do not expose port 5678 to the internet without TLS and authentication. The n8n editor holds your
database credentials in plain reach of whoever opens it.

---

## Credentials

Create these three with **exactly these names** — the workflow JSON references them by name, so a
typo means every node shows "credential not found".

### 1. `Amantrika Supabase (Postgres)`

Supabase → Project Settings → Database → Connection string → **Session pooler**.

| Field | Value |
|---|---|
| Host | `aws-0-<region>.pooler.supabase.com` |
| Port | `5432` |
| Database | `postgres` |
| User | `postgres.<your-project-ref>` |
| Password | your database password |
| SSL | **Enabled** (`require`) |

Use the **session** pooler, not the transaction pooler on port 6543. The claim statement is a CTE
containing a writing `INSERT`, and transaction pooling handles that poorly under concurrency.

The user must bypass RLS. `postgres` does. A restricted role returns empty result sets and every
workflow silently finds nothing — which looks identical to "there is no work to do", so you would
not notice for weeks.

### 2. `Resend API`

Type **Header Auth**. Name `Authorization`, Value `Bearer re_...`.

Before activating workflows 05–10, verify a sending domain in Resend and set `AMANTRIKA_EMAIL_FROM`
to an address on it. The app currently defaults to `onboarding@resend.dev`, which only delivers to
the Resend account owner — customer emails would silently go nowhere.

### 3. `Meta WhatsApp Cloud`

Type **Header Auth**. Name `Authorization`, Value `Bearer <permanent access token>`.

This one has real setup cost, and **you can skip it entirely at first** — every owner workflow falls
back to email automatically if WhatsApp fails or is unconfigured.

1. [Meta for Developers](https://developers.facebook.com) → create a Business app → add **WhatsApp**.
2. API Setup gives you a **Phone number ID** → `AMANTRIKA_WA_PHONE_NUMBER_ID`.
3. Generate a **permanent** token via a System User in Business Settings. The default token expires
   in 24 hours and your alerts would quietly stop.
4. Add your own number as a recipient → `AMANTRIKA_OWNER_WHATSAPP` (E.164, no `+`, e.g.
   `919876543210`).
5. Create a message template, category **Utility**, named `amantrika_ops_alert`, body exactly:

   ```
   Amantrika: {{1}}
   ```

   Approval usually takes minutes to a few hours. Utility templates are approved far more readily
   than Marketing ones — do not be tempted to pick Marketing.

Template parameters cannot contain newlines, which is why every render node produces a separate
single-line `whatsapp` string next to the HTML.

---

## Bringing it up, in order

```
1. supabase db push                     apply the automation_ledger migration
2. deploy n8n                           option A, B or C above
3. AMANTRIKA_DRY_RUN=true               before anything else
4. create the 3 credentials
5. import all 11 workflows              they arrive inactive
6. execute each one manually            check counts, read the rendered emails
7. execute each one a SECOND time       must produce zero new ledger rows
8. delete the dry-run rows
9. AMANTRIKA_DRY_RUN=false
10. activate 01 and 02 only             owner alerts, low blast radius
11. watch for a day
12. activate 04                         the one that catches paid-but-unpublished
13. activate the rest                   05-10 touch real customers, go last
```

Steps 6 and 7 are in `README.md` with the exact SQL. Do not skip step 7 — it is the only proof that
nobody will be emailed twice.

---

## Keeping it alive

**Failure notifications.** n8n → Settings → set an **error workflow**, or at minimum turn on email
on workflow failure. Otherwise a broken Postgres credential means your automations stop and nothing
tells you.

**The weekly check** (also in `README.md`):

```sql
select workflow, kind, status, count(*)
from automation.notifications
where claimed_at > now() - interval '7 days'
group by 1,2,3 order by 1,2;

-- Anything stuck here for over an hour means a workflow died mid-run.
select * from automation.notifications
where status = 'claimed' and claimed_at < now() - interval '1 hour';
```

**Upgrades.** Pin a version rather than `latest` once you are live (`n8nio/n8n:1.70.0`), so a
restart cannot silently change node behaviour under you.

---

## The alternative: no n8n at all

You should know this option exists, because your own spec points at it.

`project-overview.md` §2.1 locks the product to one app, one Supabase project, one deployment. §5
already specifies `api/cron/{expire,nudge,archive-offer}/route.ts` and `CRON_SECRET`, and the stack
line names **Vercel Cron**. In other words, the spec's plan was always to do this inside the app.

That path looks like:

```ts
// src/app/api/cron/nudge/route.ts
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("unauthorized", { status: 401 });
  }
  // the SQL from n8n/sql/05-stale-drafts.sql, run through the service-role client
  // the claim from n8n/sql/00-ledger-helpers.sql
  // sendEmail() from src/lib/email/send.ts — already never-throws and idempotent
}
```

```json
// vercel.json
{ "crons": [{ "path": "/api/cron/nudge", "schedule": "20 * * * *" }] }
```

| | n8n | Vercel Cron |
|---|---|---|
| Extra cost | €5–24/mo | none |
| Extra service to run | yes | no |
| Matches §2.1 | no (bounded exception) | yes |
| Change a schedule | drag in a UI | code change + deploy |
| See what a workflow did | execution log, visually | your logging, whatever it is |
| Retries, error branches | built in | you write them |
| Hobby plan limit | — | **2 cron jobs, once per day** — you would need Pro |

**Everything in this folder transfers.** The migration, the ledger, the claim-before-send pattern
and all thirteen queries are plain Postgres — they do not care what calls them. If you move to
Vercel Cron later, you keep the hard part and throw away only the JSON.

My honest read: use n8n now because you can have all ten of these running this afternoon and iterate
on the copy in a UI without a deploy. Revisit once the messages have stopped changing.
