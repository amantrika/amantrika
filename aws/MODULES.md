# The two stacks, side by side

## They are two live deployments of one repository

| | Vercel stack | AWS stack |
| --- | --- | --- |
| **URL** | <https://amantrika.imswarnil.com> | <https://amantrika-aws.imswarnil.com> |
| Hosting | Vercel | Amplify (`d13njc1yveny1`) |
| Branch | `main` | `aws-migration` |
| `STACK` | unset → `vercel` | `aws` |
| Data | Supabase Postgres | DynamoDB `amantrika` |
| Auth | Supabase Auth | Cognito `ap-southeast-1_lkjHBiWu1` |
| Files | Supabase Storage | S3 `amantrika-media` |
| Email | Resend | SES |

**The separation is already real.** It is not a plan — two domains, two
deployments, two sets of backing services, running at the same time from the
same source. What decides which is a single environment variable per
deployment, and neither can accidentally become the other: `STACK` is read
once, in `src/lib/stack.ts`, and everything else follows it.

That is deliberately *not* two repositories. Two repos means every product
change is made twice and they drift within a week. One repo with a switch means
a bug fixed in the builder is fixed on both, and the only difference between the
deployments is where the bytes are stored.



`STACK=vercel` and `STACK=aws` are two complete implementations behind the same
seams. **Neither is being deleted.** The Supabase code stays — it is what runs
in production today, it is the cheaper stack on a free tier, and it is the one
worth learning the concepts of.

## Where each lives

| Concern | Vercel stack | AWS stack | The seam between them |
| --- | --- | --- | --- |
| Invitation reads | `src/lib/data/supabase-provider.ts` | `src/lib/data/aws-provider.ts` | `src/lib/data/index.ts` |
| Database access | `src/lib/supabase/{client,server}.ts` | `src/lib/aws/{dynamo,keys}.ts`, `src/lib/aws/repo/` | `src/lib/data/provider.ts` |
| Sign-in, sessions | `@supabase/ssr` + `src/middleware.ts` | `src/lib/aws/auth/{cognito,session}.ts` | `src/lib/auth.ts` → `getProfile()` |
| Email | `src/lib/email/client.ts` (Resend) | `src/lib/email/ses.ts` + `templates.ts` | `src/lib/email/send.ts` → `sendEmail()` |
| Media | Supabase Storage | S3 `amantrika-media` + presigned PUT | `registerAsset()` / `createUploadTicket()` |
| RSVPs, wishes, stats | direct tables + RPCs | `src/lib/aws/repo/guest.ts` | `src/lib/invites/queries.ts` |
| Orders, payments | `orders`, `payment_events` | `src/lib/aws/repo/orders.ts` | the webhook route |
| Schema | `supabase/migrations/*.sql` | `aws/DATA-MODEL.md` | — |
| Deploy | Vercel from `main` | `amplify.yml` (Amplify) | — |

**The rule:** nothing outside a seam names a concrete backend. A page never
imports `supabase-provider` or `aws-provider`; it calls `getPublishedInvite()`.
That is what keeps `STACK` a switch rather than a rewrite.

## Reading this to learn Supabase

The Supabase files are the better teaching material of the two, because Supabase
does in one line what AWS makes you build. Read them in pairs — the contrast is
where the concept lives:

| Concept | Read | Then read | What the contrast teaches |
| --- | --- | --- | --- |
| **Row-level security** | `supabase/migrations/…_row_level_security.sql` | `src/lib/aws/repo/invites.ts` | Postgres filters rows *inside the database*, so a page that forgets its `where` is still safe. DynamoDB has no such layer, so every check is hand-written — and one omission is a hole for every caller. |
| **Security-definer RPCs** | the `get_public_invite`-shaped functions in the migrations | `getPublishedInviteBySlug()` | A stored function can be granted to anonymous users without granting the tables underneath. There is no equivalent; the allow-list projection replaces it. |
| **Triggers** | `handle_new_user()` in the core schema | `ensureProfile()` in `repo/profiles.ts` | A trigger makes "a user always has a profile" impossible to violate. Application code can only make it *usually* true. |
| **Auth sessions** | `src/lib/supabase/server.ts` | `src/lib/aws/auth/session.ts` | `@supabase/ssr` hides cookie storage, verification and refresh. Cognito hands you three JWTs and leaves all of it to you — that whole file is what Supabase was doing for free. |
| **Relational modelling** | `supabase/migrations/…_core_schema.sql` | `aws/DATA-MODEL.md` | Seventeen tables with joins, versus one table where the access patterns *are* the schema and a wrong key is a redesign. |
| **Aggregation** | the `event_stats` / `admin_daily_series` functions | the counter section of `DATA-MODEL.md` | `group by` computes an answer from history. Counters must be incremented as history happens — a number not counted at the time cannot be recovered. |

The honest summary: **Supabase gives you Postgres with the safety rails already
bolted on.** Most of the AWS work in this repo is rebuilding rails that came as
standard. That is worth knowing before concluding one is simply better.

## Cost, since the free tier is the constraint

| | Vercel stack | AWS stack |
| --- | --- | --- |
| Idle | $0 (Supabase free, Vercel Hobby) | ~$0 (DynamoDB on-demand, Cognito under 10k MAU) |
| Real caveat | Hobby forbids commercial use — a paid product needs Pro at $20/mo | Genuinely pay-per-request, but more moving parts to get wrong |

So while nothing is being sold, **the Vercel stack is free and the AWS stack is
near-free.** The reason to move is not this month's bill; it is that Hobby stops
being allowed the day money changes hands.

## What the AWS stack still cannot do

Kept here rather than in a commit message, because it is the list that decides
whether the AWS domain can take a real customer:

| Missing | Behaviour today |
| --- | --- |
| SES production access | Sandboxed — mail reaches `@amantrika.com` only. **The blocker for any customer email.** |
| Named guest lists (per-guest links) | Returns empty, not an error |
| Showcase, feature requests, partner/agent flows, admin analytics | Supabase-only; those pages are empty or fail |
| Google sign-in | Federation not configured; the button is hidden |
| Point-in-time recovery on the table | Off. Turn on before real data. |
| The demo account | `demo@gmail.com` exists with a weak shared password — delete before launch |

## Deleting one, later

When the AWS side is complete and has run in production for a while, the
Supabase implementations can go: `supabase-provider.ts`, `src/lib/supabase/`,
`client.ts`, the `@supabase/*` dependencies, and the Supabase branches in
`auth.ts` and `middleware.ts`. Everything else stays untouched, because nothing
else names them.

Until then, both work, and `STACK` decides.
