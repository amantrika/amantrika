# Moving Amantrika to AWS

Written 9 Aug 2026. Read `README.md` first for the shape; this file is the work.

Ordered so that **every phase ships value on its own and can be stopped at**.
Nothing here is a big-bang cutover. Phases 1–4 are reversible in an afternoon;
Phase 5 is not, which is why it is last and gated.

---

## Where you are today

| Concern | Today | Costs when idle |
| --- | --- | --- |
| Hosting + SSR | Vercel | $0 (Hobby) — but Hobby forbids commercial use, so a real launch means $20/mo Pro |
| Database, Auth, Storage, RLS | Supabase `wzwzeoqaaronnuvfzvxf`, ap-southeast-1 | $0 free tier, pauses after 7 days idle |
| Email | Resend | $0 up to 3k/mo |
| Theme gallery media | Cloudinary (`NEXT_PUBLIC_CLOUDINARY_CLOUD`) | $0 free tier |
| Guest-uploaded media | Supabase Storage `event-assets` bucket | included above |
| Blog | **MDX files in `content/blog/`, compiled at build** | $0 — there is no engine |
| DNS | wherever `imswarnil.com` is registered | registrar's fee |
| Analytics | PostHog (proxied through `/ingest`) | $0 free tier |
| Payments | Dodo | per-transaction |
| Cron | Vercel Cron, one job, `vercel.json` | $0 |

Two things fall out of that table immediately:

- **There is no blogging engine to migrate.** `content/blog/*.mdx` is read at
  build time by `src/lib/content/`. It moves wherever the app moves, for free.
  Cross it off the list.
- **Vercel Hobby is not a viable end state for a paid product.** So the real
  comparison is not "AWS vs free", it is "AWS vs $20/mo Vercel Pro". That
  changes the maths in AWS's favour for hosting, and only for hosting.

---

## Phase 0 — Account safety. Do this before anything else. (~30 min)

The single biggest risk in "pay as you go" is not the steady-state bill, it is
the runaway one: a misconfigured CloudFront, a public S3 bucket someone scrapes,
a Lambda in a retry loop. AWS will not stop you. Set the tripwires first.

```bash
aws configure sso              # or `aws configure` with an IAM user's keys
aws sts get-caller-identity    # must print your account id before you continue
```

Then, in this order:

1. **Stop using the root user.** Create one IAM Identity Center (SSO) user with
   `AdministratorAccess`, turn on MFA for it *and* for root, and put the root
   password somewhere you will not touch again.
2. **Region: `ap-southeast-1` (Singapore)** — set as the CLI default on
   9 Aug 2026 so nothing lands in `us-east-1` by accident.

   Mumbai looks like the obvious choice because the guests are Indian, and it
   is the wrong one. Guests do not talk to Lambda; they talk to a **CloudFront
   edge in India**, which is where their latency actually comes from. Lambda
   talks to **Supabase, which is in `ap-southeast-1`**. A page render makes
   several sequential database calls, so putting Lambda in Mumbai pays a
   ~60ms Singapore round trip *on each one*, while putting it in Singapore
   pays that distance once, at the edge-to-origin hop, and then queries in
   under 2ms.

   Co-locating with the database is therefore both faster and simpler. Revisit
   only if Phase 5 ever moves the database. (One fixed exception: ACM
   certificates used by CloudFront **must** live in `us-east-1`. That is a rule
   of the service, not a choice.)
3. **Budgets.** A hard one and a soft one:
   ```bash
   # $5/month, alert at 50% actual and 100% forecast, emailed to you
   aws budgets create-budget --account-id <ID> --budget file://budget-5usd.json \
     --notifications-with-subscribers file://budget-notify.json
   ```
   Also switch on **Cost Anomaly Detection** — it catches the shape of a
   runaway ("S3 requests up 400× overnight") faster than a monthly threshold
   does.
4. **Free-tier usage alerts** on in Billing preferences.
5. **Tag everything `Project=Amantrika`** from day one, so Cost Explorer can
   answer "what is this actually costing me" per phase.

**Cost of Phase 0: $0.** Deliverable: you can see the bill before it happens.

---

## Phase 1 — Email: Resend → SES (~2 hours, saves nothing today, saves $20/mo at scale)

Do this first because it is the smallest possible real migration and it teaches
you the SES/Route 53/ACM DNS dance you will repeat in every later phase.

**Why it is easy here:** every email in this product goes through one function.
`src/lib/email/send.ts` is the only caller of `src/lib/email/client.ts`, which
is the only place `resend` is imported. This is the payoff for the rule in
`CLAUDE.md` §1 that killed the n8n side-car — there is exactly one email path,
so there is exactly one thing to change.

Steps:

1. Verify the sending domain in SES (`ap-southeast-1`), publish the DKIM CNAMEs and
   the custom MAIL FROM records. Add DMARC while you are in there.
2. **Request production access.** New SES accounts are sandboxed: 200
   messages/day, and only to addresses you have verified. The request is a form
   and usually clears within 24h — do it on day one of this phase, not day two,
   or it blocks the cutover.
3. Add `@aws-sdk/client-sesv2` and write `sendViaSes()` next to the Resend
   implementation. Keep the same signature.
4. Select on an env var — `EMAIL_PROVIDER=resend|ses` — exactly as
   `PAYMENT_PROVIDER` already does. Flip it in preview, watch it, flip it in
   production, delete the Resend branch a week later.
5. Bounce and complaint handling: subscribe an SNS topic to SES events and drop
   hard bounces into the existing `notification_optout` RPC. Skipping this is
   how a sending reputation dies.

**Cost: $0.10 per 1,000 emails.** No monthly fee, no idle charge. Sending from
Lambda gets 3,000 free messages/month.

**Watch out:** SES is per-region and its reputation is per-account. One
enthusiastic import of a stale contact list can get your sending paused.

---

## Phase 2 — DNS: **cancelled.** DNS stays on Vercel. (9 Aug 2026)

Decided by the owner: the domain does not move. No Route 53 hosted zone, no
nameserver change, no `$0.50/month`. This is the cheapest possible answer and it
costs nothing to reverse later — Route 53 is a nameserver switch away whenever
you want it.

**What this changes in the other phases:** every DNS record AWS asks for gets
created in Vercel's DNS panel instead of by CLI. There are three sets, and all
three are ordinary CNAMEs:

| Phase | Records | Why |
| --- | --- | --- |
| 1 | 3 DKIM CNAMEs + a MAIL FROM MX/TXT + DMARC TXT | SES verifies the sending domain |
| 4 | 1 ACM validation CNAME | The certificate for CloudFront |
| 4 | The apex/subdomain record → CloudFront | The actual cutover |

Two practical notes:

- **Vercel DNS supports `ALIAS` at the apex**, so pointing a bare domain at a
  CloudFront distribution works. On a subdomain it is a plain CNAME.
- **`imswarnil.com` is not in the `amantrika` Vercel account.** `vercel domains
  ls` under that scope returns zero; the subdomain is merely assigned to the
  project. So the `vercel dns add` CLI, authed here as `contact-57710135` under
  scope `amantrika`, **cannot create these records** — they have to be added in
  whichever account holds the zone. Expect to paste records by hand, or switch
  scope with `vercel switch` first.

That last point is the one that will waste time if it is discovered mid-phase
rather than now.

---

## Phase 3 — Media: Cloudinary + Supabase Storage → S3 + CloudFront (~1 day)

Two separate media stories share one destination:

- **Theme gallery images** — currently Cloudinary, referenced by delivery path
  with the cloud name held in `NEXT_PUBLIC_CLOUDINARY_CLOUD`. The `atheme` rows
  deliberately store paths *without* the account, so switching accounts is an
  env change rather than an UPDATE over every row. That same indirection is
  what makes this migration cheap: re-point the base URL, and the rows do not
  move.
- **Guest/host uploads** — currently the Supabase `event-assets` bucket, written
  from `src/lib/invites/asset-actions.ts` and `PhotoUploader.tsx`.

Target shape, minimum viable:

```
S3 bucket (private, Block Public Access ON)
    ↑ presigned PUT from the browser        ↓ read
  PhotoUploader                     CloudFront + Origin Access Control
                                             ↓
                                    /i/[slug] <img>
```

1. One bucket, `amantrika-media-prod`, versioning on, public access blocked.
   **Never make the bucket public** — CloudFront reads it through OAC.
2. CloudFront distribution in front, with a cache policy that caches images for
   a year (they are content-addressed by upload id already).
3. Uploads become presigned `PUT` URLs minted in a Server Action. The service
   credentials stay server-side — same rule as `CLAUDE.md` §2.7, new provider.
4. Image resizing: Cloudinary was doing this for you. The cheap replacement is
   **CloudFront Functions + Lambda@Edge on origin-miss**, or simply generating
   two or three fixed sizes at upload time in the Server Action. **Do the
   latter.** For a product where images are chosen once by a host and then read
   by 300 guests, on-the-fly resizing is a cost and a complexity you have not
   earned yet.
5. Copy the existing assets across (`aws s3 sync`), flip the base URL env var,
   leave the old provider live for a fortnight, then delete.

**Non-negotiable, from `CLAUDE.md` §1.1:** `/i/[slug]` must stay under 100KB of
client JS and fast on Slow 4G. CloudFront's India edges will beat Cloudinary's
free tier here, but only if you keep serving modern formats and explicit
dimensions. Do not let this phase quietly regress LCP — measure before and after
on the same invitation.

**Cost: $0.023/GB-month storage, $0.085/GB out via CloudFront (India edge),
$0 when nobody looks at it.** Genuinely pay-as-you-go. 1TB/month out is free
under the always-free tier.

---

## Phase 4 — Hosting: Vercel → CloudFront + Lambda via OpenNext (~2 days)

This is the phase with the real money in it, and it is less frightening than it
sounds because **the app does not change**. OpenNext compiles a standard
Next.js 15 App Router build into Lambda handlers plus S3 static assets plus a
CloudFront distribution. Server Components, Server Actions, route handlers,
middleware, ISR — all supported.

**Use SST v3 (`sst.config.ts`) with the OpenNext Next.js component.** The
alternative, AWS Amplify Hosting, is a click-through and genuinely simpler, but
it hides the CloudFront config from you and its build minutes are billed
separately. SST gives you the same primitives with the config in the repo, which
is what the rest of this project's conventions want.

```
CloudFront
 ├── /_next/static/*, /public/*  → S3 (immutable, 1-year cache)
 ├── /i/*  and everything else   → Lambda (server function, ARM64)
 └── /_next/image/*              → Lambda (image optimiser)
EventBridge Scheduler → Lambda → GET /api/cron/abandoned-draft  (Bearer CRON_SECRET)
```

Order of work:

1. `npm i -D sst` and write `sst.config.ts` with one `Nextjs` component. Deploy
   to a `dev` stage on a subdomain first. **Do not touch the production domain
   until you have clicked through every surface on the dev stage.**
2. Move secrets out of `.env` into **SSM Parameter Store** (standard parameters
   are free) or Secrets Manager ($0.40/secret/month — Parameter Store is the
   right call at your size). `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`,
   `DODO_*`, `PAYMENT_WEBHOOK_SECRET`.
3. **The payment webhook needs attention.** `src/app/api/payments/webhook/route.ts`
   reads the raw body before any parser touches it (`CLAUDE.md` §2.3). Behind a
   Lambda function URL the body may arrive base64-encoded; verify the signature
   check still passes against a real Dodo test event, not a hand-made curl.
4. **Replace Vercel Cron with EventBridge Scheduler.** One rule, `0 9 * * *`,
   invoking a tiny Lambda that calls `/api/cron/abandoned-draft` with the
   `CRON_SECRET` bearer. Delete `vercel.json` in the same commit that adds it.
5. Drop `@vercel/analytics` and `@vercel/speed-insights`. PostHog already covers
   product analytics; CloudWatch RUM is the AWS equivalent for Web Vitals and is
   worth exactly nothing to you right now — skip it and read Lighthouse.
6. Logs go to CloudWatch. **Set a 7-day retention policy on the log group on
   day one.** Forgotten CloudWatch logs are the most common way a "$0 idle"
   AWS account quietly starts costing $3/month.
7. Cut over by moving the CloudFront alias onto the apex, with Vercel still
   live and one DNS record away.

**What you lose, honestly:** preview deployments per pull request (SST stages
can do it, but you configure it), Vercel's build cache, the Vercel dashboard's
instant log tail, and the "it just works" of the Vercel/Next.js relationship.
When Next.js 16 ships something new, OpenNext supports it weeks later, not the
same day.

**What you gain:** the bill goes to roughly zero when nobody visits, and you are
no longer on a Hobby plan whose terms you would be violating the moment you take
money.

**Cost: ~$0–2/month at your traffic.** Lambda's 1M free requests and 400,000
GB-seconds per month cover an invitation product's entire early life. CloudFront
gives 1TB out and 10M requests free monthly. The realistic idle bill is the
$0.50 hosted zone plus pennies of S3.

---

## Phase 5 — The database. Read this before deciding. (weeks, and gated)

Everything above is a swap. This is not.

### What Amantrika actually depends on

Not "Postgres" — Supabase:

- **19 migrations**, of which `20260807000200_row_level_security.sql` and its
  successors express the entire authorization model as RLS policies keyed on
  `auth.uid()`. Host, agent and admin separation lives in the database.
- **~20 security-definer RPCs** — `get_public_invite`-shaped reads, `submit_rsvp`,
  `admin_analytics`, `cast_feature_vote`, `record_page_view`, `notification_claim`.
  `CLAUDE.md` §2.6 makes these the *only* path for guest traffic. Anon has
  SELECT on nothing.
- **Supabase Auth** — email/password with confirmations, Google OAuth
  (`signInWithOAuth`), and `@supabase/ssr` cookie sessions read by middleware.
  The `profiles` row is created by a signup trigger. Roles are assigned there.
- **Supabase Storage** — handled in Phase 3.
- **`supabase-js` everywhere.** Every read and write in `src/` goes through it.

`auth.uid()` is the hinge. It is a Supabase function reading a Supabase JWT. On
plain Postgres it does not exist, so *every RLS policy stops working*, so the
authorization model has to be rebuilt — either as `current_setting('app.user_id')`
with a `SET LOCAL` on every connection, or moved into application code.

### What that means in work

| Piece | Replacement | Honest size |
| --- | --- | --- |
| Postgres itself | Aurora Serverless v2 (min 0 ACU) or RDS | Small — `pg_dump`/`pg_restore` |
| RLS on `auth.uid()` | `SET LOCAL app.user_id` per transaction, policies rewritten | Medium, and security-critical |
| Security-definer RPCs | Port as-is; they are plain PL/pgSQL | Small |
| Supabase Auth | Cognito user pool + hosted UI, or Auth.js on your own tables | **Large.** Password hashes can be migrated into Cognito, but every existing user's session breaks and OAuth has to be re-consented |
| `supabase-js` calls | `pg`/Drizzle/Kysely, rewritten call by call | **Large.** Hundreds of sites |
| Realtime | Not used — `grep` finds no channels | None |

### And the cost does not go the way you want

This is the part that matters most given your brief.

- **RDS `db.t4g.micro`** — ~$12/month, billed hourly, **whether or not anyone
  uses it.** That is the opposite of what you asked for.
- **Aurora Serverless v2 with a 0-ACU minimum** — genuinely scales compute to
  zero after inactivity, so idle compute is ~$0. But storage is billed
  regardless (~$0.10/GB-month, small for you), and a cold resume costs a
  visible pause on the first request. For a link that 300 guests open in a
  five-minute burst during a wedding, the first of them waits.
- **Aurora DSQL** — pay-per-request, no idle cost, and the closest thing AWS has
  to what you want. But it is not full Postgres: no extensions, restricted
  PL/pgSQL, and feature gaps that this schema (triggers, security-definer
  functions, RLS) walks straight into. **Do not port this schema to DSQL.**
- **Supabase free tier** — $0, pauses after a week of inactivity, and already
  works.

### So the recommendation

**Do not do Phase 5 yet.** Do Phases 0–4, keep Supabase as your database and
identity provider, and revisit when one of these becomes true:

- You outgrow the Supabase free tier (then it is $25/month, and the comparison
  is honest rather than against $0).
- A compliance or data-residency requirement forces single-vendor AWS.
- You have a second developer, so a multi-week auth rewrite is not the only
  thing happening for a month.

Supabase runs *on* AWS. "Everything on AWS" is already 80% true; what Phase 5
buys is the last vendor relationship, at the price of the riskiest code change
this product could make. That is a bad trade for a pre-revenue, one-developer
product — and if you decide to make it anyway, make it deliberately, with this
paragraph read and disagreed with, not by drifting into it.

**If and when you do it,** the order is: Aurora Serverless v2 (min 0 ACU) →
port schema and RPCs → rebuild RLS on session variables → dual-write and verify
→ migrate auth last, on a quiet week, with every user warned that they will
sign in again.

---

## What the finished stack looks like after Phase 4

| Concern | Service | Idle cost |
| --- | --- | --- |
| Hosting + SSR | CloudFront + Lambda (OpenNext/SST) | ~$0 |
| Static assets | S3 | cents |
| Media | S3 + CloudFront | cents |
| Email | SES | $0 |
| DNS | **Vercel (unchanged)** | $0 |
| Cron | EventBridge Scheduler | $0 |
| Secrets | SSM Parameter Store | $0 |
| Logs | CloudWatch, 7-day retention | ~$0 |
| Database, Auth | **Supabase (unchanged)** | $0 |
| Payments | Dodo (unchanged) | per-transaction |
| Analytics | PostHog (unchanged) | $0 |

**Total idle: under $0.10/month** now that DNS stays on Vercel — there is no
longer a single per-hour charge anywhere in the stack. Total at a few hundred
invitations a month: a couple of dollars. That is the brief, met — and met
without touching the one system whose replacement could break the product.

---

## Suggested sequencing

| Session | Work |
| --- | --- |
| 1 | Phase 0 end to end. Nothing else. |
| 2 | Phase 1 — SES, including the production-access request early |
| ~~3~~ | ~~Phase 2 — Route 53~~ — cancelled, DNS stays on Vercel |
| 3–4 | Phase 3 — S3 + CloudFront media |
| 5–6 | Phase 4 — SST/OpenNext on a dev stage, then cut over |
| — | Stop. Re-read Phase 5 when the triggers above fire. |

Per `CLAUDE.md` §8: one phase per session, ending in a commit and a
`progress.md` update.
