# What this actually costs

All figures `ap-southeast-1` (Singapore) unless noted, listed as of Aug 2026. Treat
them as the right order of magnitude, not a quote — check the pricing page
before you commit to anything above a few dollars.

## The rule that matters

Split every service into **per-hour** and **per-use**. Per-use is what you asked
for. Per-hour is what quietly bills you at 3am on a month with no users.

**With DNS staying on Vercel (decided 9 Aug 2026), the Phase 0–4 stack has no
per-hour charge at all.** Every line below is requests, GB, or GB-months. Zero
traffic really does mean approximately zero bill.

## The cheapest-option choices, made explicit

Each of these is a place where the obvious AWS answer costs money and a slightly
less obvious one does not. They are decisions, not defaults — if a later session
changes one, it should change it knowingly.

| Decision | Instead of | Saves |
| --- | --- | --- |
| No Route 53 zone; DNS stays on Vercel | Route 53 hosted zone | $0.50/mo, forever |
| **No VPC for anything** | Lambda-in-VPC, which needs a NAT gateway | **~$32/mo** — the single largest avoidable cost on AWS |
| SSM Parameter Store (standard) | Secrets Manager | $0.40 per secret per month |
| ARM64 (Graviton) Lambda | x86 | ~20% of compute |
| Fixed image sizes generated at upload | Lambda@Edge on-the-fly resizing | Per-request compute on every image miss |
| CloudWatch log retention 7 days | Default (never expire) | Grows forever; the classic silent bill |
| S3 + CloudFront with OAC | S3 static website hosting + separate CDN | Egress priced once, not twice |
| Supabase stays (Phase 5 parked) | RDS `db.t4g.micro` | **~$12/mo, billed hourly whether used or not** |
| One region, `ap-southeast-1` | Multi-region | Cross-region transfer |
| No CloudWatch RUM / X-Ray / Container Insights | The full observability suite | Per-event charges for data you would not read |

The two that matter most are **no NAT gateway** and **no RDS instance**. They are
also the two most common ways a "serverless, pay-as-you-go" AWS setup quietly
becomes $45/month. Nothing in Phases 0–4 needs either — Lambda talks to
Supabase, SES and S3 over the public internet, which is free and correct here.

## Idle — nobody visits for a whole month

| Service | Cost |
| --- | --- |
| DNS (Vercel, unchanged) | $0 |
| S3 (app assets + a few hundred MB of media) | ~$0.02 |
| Lambda | $0 — no invocations |
| CloudFront | $0 — no requests |
| SES | $0 — no sends |
| EventBridge Scheduler (31 cron fires) | $0 |
| SSM Parameter Store (standard) | $0 |
| CloudWatch Logs (7-day retention, cron only) | ~$0.01 |
| **Total** | **~$0.03/month** |

Under the signup credits that is free for the first six months, and after them
it rounds to nothing. An account with no users costs you nothing — which was the
brief.

## Light real usage — 50 invitations, ~15,000 guest page views, 2,000 emails

| Service | Driver | Cost |
| --- | --- | --- |
| Lambda | ~40k invocations, ARM64, 1024MB, ~200ms | $0 (inside 1M free) |
| CloudFront | ~8GB out, ~200k requests | $0 (inside 1TB / 10M free) |
| S3 | 5GB stored, requests | ~$0.20 |
| SES | 2,000 emails | $0.20 |
| DNS (Vercel) | — | $0 |
| CloudWatch | logs | ~$0.30 |
| **Total** | | **~$0.70/month** |

## Heavier — 500 invitations, ~200,000 guest page views, 20,000 emails

| Service | Cost |
| --- | --- |
| Lambda (~500k invocations) | ~$0.50 |
| CloudFront (~90GB out) | ~$7.50 |
| S3 (40GB + requests) | ~$1.20 |
| SES | $2.00 |
| DNS (Vercel) | $0 |
| CloudWatch | ~$1.50 |
| **Total** | **~$12.70/month** |

Compare: Vercel Pro alone is $20/month before bandwidth overages.

## Phase 5, if you ever do it — the numbers that argue against it

| Option | Idle cost | Note |
| --- | --- | --- |
| Supabase free (today) | **$0** | Pauses after 7 days idle |
| Supabase Pro | $25/mo | The honest comparison once you outgrow free |
| RDS `db.t4g.micro` | **~$12/mo, always** | Billed hourly regardless of traffic. Fails your brief. |
| Aurora Serverless v2, min 0 ACU | ~$1–3/mo storage | Compute genuinely goes to zero; cold resume delays the first request |
| Aurora DSQL | per-request | Cheapest idle, but not Postgres-compatible enough for this schema |

Plus Cognito: 10,000 monthly active users free on the Lite tier, so auth itself
is not the cost — the rewrite is.

## Guardrails — set these in Phase 0, not after the surprise

1. **Two AWS Budgets**: $5/month alerting at 50% actual, and a forecast alert at
   100%. Email to an address you actually read.
2. **Cost Anomaly Detection** on the whole account. It catches shape changes
   ("S3 GET requests up 400× overnight") days before a threshold does.
3. **CloudWatch log retention 7 days** on every log group, set at creation.
   Infinite retention is the default and is the most common silent cost.
4. **S3 Block Public Access on, account-wide.** A public bucket is both a data
   leak and an unbounded egress bill.
5. **CloudFront price class 100/200** if you want to cap edge spend — though for
   an India-first product you want the Indian edges, so leave it at All and rely
   on the free tier.
6. **A lifecycle rule** on the media bucket moving anything untouched for a year
   to Infrequent Access.
7. **Reserved concurrency on the Lambda** (say 50). A runaway loop then costs a
   throttle, not a bill.

## The one thing that can still hurt you

Egress. Everything else in this stack has a free tier generous enough to swallow
a small product whole. Bandwidth is the meter that keeps turning — so keep
`/i/[slug]` small, keep images sized correctly at upload (Phase 3), and keep the
1-year immutable cache headers on `/_next/static`. That is the same discipline
`CLAUDE.md` §1.1 already demands for guest speed. On AWS it is also the bill.
