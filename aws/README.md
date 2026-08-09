# `aws/` — the AWS migration workspace

This folder holds the plan, the cost model and (later) the infrastructure code
for moving Amantrika off its current third-party stack onto AWS.

Phase 0 has begun — an account exists and its guardrails are set. **Nothing in
`src/` depends on AWS yet, and no traffic has moved.** `STATUS.md` is the
authoritative record of what is actually provisioned; this file and `PLAN.md`
describe intent.

| File | What it holds |
| --- | --- |
| `STATUS.md` | **What exists in AWS right now.** Read this before touching anything. |
| `PLAN.md` | The migration, in phases, ordered by (value ÷ risk). Start here. |
| `COSTS.md` | What each phase costs when nobody uses the product, and what it costs at 100 / 1,000 invitations. Plus the guardrails that stop a surprise bill. |
| `DECISIONS.md` | The choices that are yours, not mine — with a recommendation for each. Answer these before Phase 3. |

## The one-paragraph version

Three of the things you want to move are easy, cheap and genuinely
pay-as-you-go: **email** (Resend → SES) is one file, **media** (Cloudinary →
S3 + CloudFront) is one adapter, and **hosting** (Vercel → Lambda + CloudFront
via OpenNext) is a build-tool swap that costs near-zero when idle. The blog is
MDX files inside this repo — there is no blogging engine to move at all. **DNS
stays on Vercel** by the owner's decision (9 Aug 2026), which saves the one
fixed monthly charge this plan would otherwise have had.

The fifth, **the database**, is the whole difficulty. Amantrika is not "using
Postgres"; it is using Supabase — 19 migrations of row-level security keyed on
`auth.uid()`, ~20 security-definer RPCs, Supabase Auth with Google OAuth, and
Supabase Storage. Replacing it means replacing the auth system *and* the
authorization model *and* every data call in the app. It is a rewrite, not a
migration, and AWS has no product that is both Postgres-compatible and free
when idle in the way Supabase's free tier is.

So the plan splits: **Phases 1–4 you can do this month and they will save you
money.** **Phase 5 (the database) is deliberately last, gated behind a decision,
and my recommendation is to not do it until you have paying users.**

## Ground rules this plan obeys

Taken from your brief:

1. **Zero traffic must mean a near-zero bill.** Every service chosen is
   per-request or per-GB. After the DNS decision there is **no hourly charge
   anywhere in Phases 0–4** — the idle bill is about $0.03/month. The two
   biggest hourly traps on AWS, a NAT gateway (~$32/mo) and an RDS instance
   (~$12/mo), are both deliberately absent; see the decision table in
   `COSTS.md`.
2. **Bare minimum first.** No VPC, no NAT, no ECS, no Kubernetes, no
   multi-account Organization, no CDK bootstrap you have to maintain. Single
   region, single account, managed services only.
3. **Expandable later.** Nothing here paints you into a corner: OpenNext
   deploys the same Next.js app you have, SES sends through the same
   `sendEmail()`, S3 sits behind the same asset adapter.

## Also true, and worth saying once

The free tier you signed up for is the current AWS model: **$100 in credits on
signup plus up to $100 more for completing setup activities, valid 6 months**,
alongside the always-free per-service allowances (1M Lambda requests/month, 1TB
CloudFront out/month, 3,000 SES messages/month from Lambda). The old
"12 months of a free t2.micro" tier applies only to older account types. Assume
credits, not permanence — build the billing alarms in Phase 0 regardless.
