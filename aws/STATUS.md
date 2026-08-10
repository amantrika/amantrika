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
| **Repository layer** | `src/lib/aws/` — client, key builders, types, invitations + profiles repos | — |
| **Cognito auth** | Sign-up, confirmation code, sign-in, sessions, middleware refresh, profiles | $0 |
| **SES templates** | `amantrika-welcome`, `amantrika-payment-receipt`, `amantrika-rsvp-received` — pushed from `src/lib/email/templates.ts` | $0.10/1000 sent |
| **SNS bounce topic** | `amantrika-email-events` + config set `amantrika-default`, on BOUNCE/COMPLAINT/DELIVERY_DELAY/REJECT. **Nothing is subscribed yet** — bounces are recorded and acted on by nobody | $0 |
| **GitHub OIDC + deploy role** | `amantrika-github-deploy`, trusts `repo:amantrika/amantrika:*`, PowerUserAccess (not Administrator) | $0 |
| **Repo secrets** | 12 secrets set via `gh`; workflow reads the `STACK` repo variable | — |
| **The `STACK` switch** | `STACK=vercel\|aws` picks data, auth and email together | — |
| **S3 media bucket `amantrika-media`** | Private, versioned, CORS for presigned PUTs, cold→IA after a year, aborts stale multipart uploads. Keys: `invites/<eventId>/{photos,video,audio,documents}/` | per GB |
| **Amplify Hosting** | App `d13njc1yveny1`, branch `aws-migration`, GitHub-connected — every push builds and deploys | per build minute + GB |
| **Custom domain** | `amantrika-aws.imswarnil.com`, `AVAILABLE` | — |
| **Amplify service role** | `amantrika-amplify-service` — trusts `amplify.amazonaws.com` with SourceAccount/SourceArn conditions, carries the scoped `amantrika-runtime` policy | $0 |
| **Password reset** | `/forgot` + `/reset`, Cognito code on AWS, Supabase link on Vercel | — |
| **Demo account** | `demo@gmail.com` / `Demo@123` — published invitation, 3 ceremonies, 3 photos in S3. `aws/scripts/aws-demo-data.ts --clean` removes it. **Delete before real customer data exists.** | — |

Everything above was verified by reading it back from the API, and the
repository layer by `aws/scripts/aws-smoke.ts` against the real table: 11 checks,
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
| **The other 15 entities** | Invitations and profiles have repositories. RSVPs, sub-events, guests, assets, wishes, orders, payments, agents, commissions, feature requests, showcase, themes and the admin allowlist still need porting. |
| **Most of the 73 Supabase call sites** | The guest invitation read, sign-in/sessions and the dashboard list are ported. Everything else — the builder, guest lists, RSVPs, stats, showcase, marketing — is still Supabase in both stacks. |
| **Google federation** | Not configured on the pool. The button is hidden on the AWS stack rather than starting a Supabase OAuth flow the app cannot read. |
| **Partner/agent signup** | Refused on the AWS stack: the agent and referral records have no repository, and losing a referral silently is worse than declining. |
| **SNS bounce subscriber** | The topic and event destination exist; **nothing is subscribed**, so bounces are recorded and acted on by nobody. |
| **View tracking** | `/api/track` still writes to Supabase on both stacks — the DynamoDB counters do not replicate its dedup semantics, and porting it would silently change what "a view" means. |
| **Cognito → SES email** | Cognito's built-in sender is capped at 50 emails/day and is not a production path. Must point at SES once SES leaves the sandbox. |
| SES production access | Sandbox: 200/day, verified recipients only. Request not yet filed — it takes up to 24h, so file it early. |
| S3 + CloudFront media | Not started |
| **SST / OpenNext hosting** | **Blocked: AWS has not verified the account for CloudFront.** Everything else deployed; only the distribution is refused. Needs a free Account-and-billing support case — see `DEPLOY-AWS.md`. |
| Cost Explorer + Cost Anomaly Detection | Cost Explorer has **no enable API** — it activates on first console visit, and the browser hit a sign-in page. Needs a human sign-in. Anomaly detection cannot be created until it is on. |
| Free-tier usage alerts | Console-only billing preference |
| Admin IAM user / IAM Identity Center | Decision pending — see below |
| **Point-in-time recovery on the table** | **Off. Launch blocker.** Turn on before the first real customer. |

## Traps found the hard way (deployment)

1. **Amplify env vars are build-time only.** Next.js server code reads
   `process.env` at runtime in the SSR compute, which does not inherit them. An
   "all-AWS" deploy silently ran on `STACK=vercel` defaults. `amplify.yml` now
   writes `.env.production`. The tell was the Google button being visible and a
   DynamoDB-only invitation 404ing — the site otherwise looked healthy.
2. **A role's trust policy is not its permissions.** `amantrika-github-deploy`
   trusts only GitHub OIDC, so Amplify could not assume it — four builds failed
   on that alone.
3. **CloudFront in your own account needs AWS to verify the account.** Amplify
   sidesteps it because its distribution lives in AWS's account.
4. **SST cannot read `aws login` credentials**; `aws configure export-credentials
   --format env` bridges it, and those expire in ~30 minutes.
5. **A green build is not a working deploy.** Job 7 succeeded and served the
   wrong backend. Always load a page that can only work if the change took.

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

**Some of the app has moved; most has not.** `STACK=aws` genuinely serves the
guest invitation from DynamoDB, signs people in through Cognito and sends
through SES — verified in a browser. But the builder, guest lists, RSVPs, stats,
showcase and the whole marketing site are still Supabase on both stacks, media
still comes from Supabase Storage, and **production still runs on Vercel with
`STACK=vercel`.**

The order that remains:

1. Port the remaining 15 entities into `src/lib/aws/repo/`
2. Rewrite the remaining call sites, surface by surface — **auditing each for the
   unfiltered-read pattern**, where RLS was doing the filtering and nothing in
   the code was
3. File SES production access (24h lead time) and point Cognito's sender at SES
4. Subscribe something to the bounce topic
5. S3 + CloudFront for media — until this lands, `STACK=aws` still serves
   photographs from Supabase Storage
6. Finish the deploy, then the DNS change at Vercel
7. Seed the 12 themes and 5 gallery rows

Step 3 is the bulk of it. There is no shortcut and no partial state that is
safe to ship — an invitation half on Supabase and half on DynamoDB is worse
than either.
