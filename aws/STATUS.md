# AWS — what actually exists right now

Updated 9 Aug 2026. **This file is fact, not plan.** If it is not listed as
done here, it does not exist in AWS. Keep it that way.

## Account

| | |
| --- | --- |
| Account ID | `477977196441` |
| Default region | `ap-southeast-1` (Singapore — co-located with Supabase; see `PLAN.md` Phase 0) |
| CLI | `aws-cli/2.36.19`, installed via Homebrew |
| Auth method | `aws login` — browser-based console sign-in, temporary auto-refreshing credentials in `~/.aws`. **No long-lived access keys on disk.** |
| Current identity | `arn:aws:iam::477977196441:root` — **root. See the warning below.** |

## Done

| What | How | Cost |
| --- | --- | --- |
| Budget `amantrika-monthly-5usd` | $5/month, alerting at 50% actual, 100% actual and 100% forecast, all to `swarnilsinghaicse@gmail.com` | $0 — the first two budgets are free |
| S3 account-wide Block Public Access | All four flags on, before any bucket exists | $0 |
| **DynamoDB table `amantrika`** | Single table, `PAY_PER_REQUEST`, GSI1 + GSI2, TTL on `expiresAt`, deletion protection on | **$0 idle** — per-request only |
| **Cognito user pool `amantrika`** | `ap-southeast-1_lkjHBiWu1`, Essentials tier, email sign-in, email auto-verify, 8-char minimum to match the existing signup form | $0 to 10,000 MAU |
| **Cognito app client `amantrika-web`** | `7nah01uo2pnbdhvpca83flrd0d`, confidential (has a secret), auth-code flow, callbacks for prod + localhost | $0 |
| **Repository layer** | `src/lib/aws/` — client, key builders, types, invitations repo | — |

Everything above was verified by reading it back from the API, and the
repository layer by `scripts/aws-smoke.ts` against the real table: 11 checks,
all passing, including that a non-owner is refused both a read and a write.

### The database is chosen and built: DynamoDB

Aurora was the original choice; the Free plan blocked it (below), so the fallback
is DynamoDB — the only option that is both unrestricted on this plan and
genuinely $0 when idle. It costs a full data-model redesign, documented in
`DATA-MODEL.md`. **Read that file before writing a query.**

## ⛔ Blocker: the AWS **Free plan** forbids Aurora + Data API

Discovered 9 Aug 2026 by four rejected `create-db-cluster` attempts. Worth
writing down because it is not documented anywhere obvious and it invalidates
the chosen architecture.

This account was created today on AWS's newer **Free plan** (the $100-credit
model, not the old 12-month tier). On that plan:

1. `create-db-cluster` for Aurora fails outright with `FreeTierRestrictionError`
   unless you pass `--with-express-configuration`.
2. Express configuration then refuses, one error at a time:
   - `--database-name` — "doesn't support creating an initial database"
   - `--manage-master-user-password` — not supported
   - `--master-user-password` — not supported; **IAM auth is forced**
   - `--enable-http-endpoint` — **"doesn't support enabling the Data API"**

That last one is fatal. **The Data API is the entire reason Aurora was chosen**
— it is what lets Lambda reach the database *without* being inside a VPC, and
therefore without a NAT gateway at ~$32/month. Express configuration cannot
enable it, and the Free plan cannot avoid express configuration.

So on this plan, Aurora is available only in a shape that costs $32/month in
NAT to actually use — the exact opposite of the requirement.

**Other services are not affected.** SES works (sandboxed at 200/day, as
expected for a new account) and Cognito is reachable. The restriction observed
so far is Aurora-specific.

## Not done, and why

| What | Blocker / state |
| --- | --- |
| **The other 16 entities** | Only invitations have a repository. Profiles, RSVPs, sub-events, guests, assets, wishes, orders, payments, agents, commissions, feature requests, showcase, themes, admin allowlist all still need porting. |
| **73 Supabase call sites across 60 files** | Untouched. The app still runs entirely on Supabase; nothing is wired to DynamoDB yet. |
| **Cognito wiring** | Pool and client exist, but no sign-up, sign-in, session, middleware or callback code. Google federation not configured (needs a Cognito domain + Google client). |
| **Cognito → SES email** | Cognito's built-in sender is capped at 50 emails/day and is not a production path. Must point at SES once SES leaves the sandbox. |
| SES production access | Sandbox: 200/day, verified recipients only. Request not yet filed — it takes up to 24h, so file it early. |
| S3 + CloudFront media | Not started |
| SST / OpenNext hosting | Not started |
| Cost Explorer + Cost Anomaly Detection | Cost Explorer has **no enable API** — it activates on first console visit, and the browser hit a sign-in page. Needs a human sign-in. Anomaly detection cannot be created until it is on. |
| Free-tier usage alerts | Console-only billing preference |
| Admin IAM user / IAM Identity Center | Decision pending — see below |
| **Point-in-time recovery on the table** | **Off. Launch blocker.** Turn on before the first real customer. |

## ⚠️ You are operating as root

`aws login` signed in as the account root user. That identity cannot be
restricted, cannot be scoped down, and can close the account. It is mitigated
here — the credentials are short-lived and refresh-based rather than static
keys — but it is not where this should stay.

**The fix, when convenient:** enable IAM Identity Center (free), create one
admin user with MFA, and re-run `aws login` as that user. Everything in this
plan works identically afterwards.

**Why it has not been done yet:** it needs console access, which is the same
thing currently blocking Cost Explorer. Worth doing in the same sitting.

One genuine reason to keep root available: a few billing settings — activating
IAM access to billing data, free-tier alert preferences — are root-only. Do
those in the same session, then stop using it.

## Cost right now

**Effectively $0.00.** A DynamoDB on-demand table with no traffic bills nothing;
a Cognito pool with no users bills nothing; budgets and the public access block
are free. The only usage so far is the smoke test's handful of reads and writes,
which is fractions of a cent.

## The honest state of the migration

**The app has not moved.** Everything in `src/app/` still reads and writes
Supabase, still authenticates through Supabase Auth, and still deploys to
Vercel. What exists is a foundation — table, pool, repository pattern, and a
passing proof that the authorization model works — not a migration.

The order that remains:

1. Port the remaining 16 entities into `src/lib/aws/repo/`
2. Cognito sign-up / sign-in / session / middleware, replacing `@supabase/ssr`
3. Rewrite the 73 call sites, surface by surface, starting with `/i/[slug]`
4. SES (file production access first — 24h lead time)
5. S3 + CloudFront for media
6. SST / OpenNext, then the DNS cutover at Vercel
7. Seed the 12 themes and 5 gallery rows; re-create the 7 test accounts

Step 3 is the bulk of it. There is no shortcut and no partial state that is
safe to ship — an invitation half on Supabase and half on DynamoDB is worse
than either.
