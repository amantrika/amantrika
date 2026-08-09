# How to test the switch

There is now one environment variable that decides which backend serves
invitations:

```
DATA_PROVIDER=supabase   # default — the live behaviour
DATA_PROVIDER=aws        # DynamoDB
```

Unset or mistyped means `supabase`. That direction is deliberate: a typo should
degrade to the thing that works, not to an empty database.

---

## The trap that will waste your afternoon

**`unstable_cache` persists to disk under the dist directory, and it survives a
restart.** Flip `DATA_PROVIDER`, restart, and for up to five minutes you can be
served a result cached under the *other* provider — believing you are testing
DynamoDB while reading Postgres.

This bit during the very first test of the switch. Two mitigations are in place:

1. The provider name is part of the cache key (`src/lib/cache.ts`), so the two
   backends can no longer share a cache entry.
2. But the entry for *your* provider still persists across restarts. So when
   testing a data change, clear the cache:

```bash
rm -rf .next .next-awstest .next-pgtest
```

If a test result surprises you, clear the cache and repeat before believing it.

---

## 1. Prove the two backends agree (30 seconds, no server)

The strongest test, and the one to run after any change to either provider. It
fetches every published invitation through both and diffs the resulting view
field by field.

```bash
set -a; source .env.local; set +a
npx tsx --conditions=react-server scripts/aws-parity.ts
```

Expected:

```
5 identical, 0 differing, 0 missing on one side.
```

Anything else names the field that drifted. This already caught two real bugs —
sub-events mapped from columns that do not exist, and dates formatted as raw ISO
strings where the components expect `2026-08-15` and `7:00 PM`.

## 2. Prove the repository's authorization holds (10 seconds)

```bash
npm run aws:smoke
```

Eleven checks against the real table. The two that matter:

```
ok   NON-OWNER IS REFUSED (this is the RLS replacement)
ok   NON-OWNER CANNOT UPDATE
```

Run this after touching anything in `src/lib/aws/repo/`. It is the only thing
standing where 55 RLS policies used to.

## 3. Run the app on each backend, side by side

```bash
rm -rf .next-awstest .next-pgtest
set -a; source .env.local; set +a

DATA_PROVIDER=aws      NEXT_DIST_DIR=.next-awstest npx next dev -p 3111 &
DATA_PROVIDER=supabase NEXT_DIST_DIR=.next-pgtest  npx next dev -p 3112 &
```

Then open the same invitation on both and compare:

- <http://localhost:3111/invite/a-weds-c> — DynamoDB
- <http://localhost:3112/invite/a-weds-c> — Supabase

Separate `NEXT_DIST_DIR` values are required, not optional: two `next dev`
processes in one checkout corrupt each other's build directory (see
`next.config.ts`).

## 4. Prove it is *really* reading DynamoDB

Parity passing means the two agree; it does not prove the switch is wired. To
prove that, change something in DynamoDB only and watch one side move:

```bash
EID=$(aws dynamodb query --table-name amantrika --index-name GSI1 \
  --key-condition-expression "GSI1PK = :p AND GSI1SK = :s" \
  --expression-attribute-values '{":p":{"S":"SLUG#a-weds-c"},":s":{"S":"EVENT"}}' \
  --query 'Items[0].id.S' --output text)

aws dynamodb update-item --table-name amantrika \
  --key "{\"PK\":{\"S\":\"EVENT#$EID\"},\"SK\":{\"S\":\"META\"}}" \
  --update-expression "SET hosts = :h" \
  --expression-attribute-values \
    '{":h":{"L":[{"M":{"name":{"S":"DYNAMO"}}},{"M":{"name":{"S":"PROOF"}}}]}}'
```

Clear the caches, restart both servers, and the page titles should read:

```
DATA_PROVIDER=aws       →  <title>DYNAMO &amp; PROOF · Amantrika</title>
DATA_PROVIDER=supabase  →  <title>a &amp; c · Amantrika</title>
```

That is the actual observed output, not an illustration.

Put it back afterwards — the seed script is idempotent and restores from
Supabase:

```bash
npx tsx --conditions=react-server scripts/aws-seed.ts --write
```

**Note the field.** The page title is built from `hosts`, not `title` — changing
`title` proves nothing, because it is not rendered. An inconclusive test that
looks like a passing one is worse than no test.

## 5. Re-seed after Supabase changes

```bash
npx tsx --conditions=react-server scripts/aws-seed.ts           # dry run
npx tsx --conditions=react-server scripts/aws-seed.ts --write   # commit
```

Idempotent — every item is keyed deterministically, so running it twice
produces the same table. It is a **copy**: Supabase is never modified, so
switching back is always available.

---

## Testing signup on Cognito

**Signup is not on the toggle.** `DATA_PROVIDER` covers invitation reads only —
the signup *form* in the browser still goes to Supabase Auth in both modes,
because the session layer (middleware, `getUser`, every dashboard) has not been
ported. Wiring the form to Cognito before that exists would sign someone in and
then show them a logged-out app.

What *is* testable today is the whole Cognito flow, from the terminal, against
the real pool with a real email:

```bash
set -a; source .env.local; set +a
npx tsx --conditions=react-server scripts/aws-auth-test.ts you@example.com 'YourPassw0rd'
```

It signs up, waits for you to paste the 6-digit code Cognito emails you,
confirms, signs in, creates the profile in DynamoDB and reads it back. Nothing
is mocked.

Delete the test user afterwards:

```bash
aws cognito-idp admin-delete-user \
  --user-pool-id ap-southeast-1_lkjHBiWu1 --username you@example.com
```

**Cognito's built-in email sender is capped at 50 messages a day** and is not a
production path. It is fine for this test and must be replaced by SES before
launch.

### Two things worth knowing about this flow

- **`SECRET_HASH` is mandatory.** The app client has a secret, so every call
  carries an HMAC of the username and client id. Omit it and Cognito replies
  "Unable to verify secret hash for client", which reads like a broken pool
  rather than a missing parameter. Handled in `src/lib/aws/auth/cognito.ts`.
- **Nothing creates a profile automatically.** In Postgres a trigger on
  `auth.users` guaranteed a profile existed. Cognito has no hook into DynamoDB,
  so `ensureProfile()` is called by the app and is idempotent — a user who
  somehow lacks a profile gets one on their next sign-in rather than a
  permanently broken dashboard. That is weaker than a trigger, and deliberately
  so documented.

## Testing the whole signed-in app on AWS

There are now **two** switches, and they move independently:

```
DATA_PROVIDER=aws     # invitation reads from DynamoDB
AUTH_PROVIDER=cognito # sign-in, sessions and profiles from Cognito
```

Separate on purpose. They fail in completely different ways, and collapsing
them into one variable would force an all-or-nothing cutover of two systems.

```bash
rm -rf .next-cog
set -a; source .env.local; set +a
AUTH_PROVIDER=cognito DATA_PROVIDER=aws NEXT_DIST_DIR=.next-cog npx next dev -p 3210
```

A confirmed test account already exists in the pool:

```
host@amantrika.test / TestPass123
```

Delete it when you are done:

```bash
aws cognito-idp admin-delete-user \
  --user-pool-id ap-southeast-1_lkjHBiWu1 --username host@amantrika.test
```

Verified in a browser on 9 Aug 2026, end to end: sign-in redirects to
`/dashboard`, the header shows the email and role read from **DynamoDB**,
`/dashboard` while signed out redirects to `/login`, and `/invite/a-weds-c`
renders from **DynamoDB**.

### The bug this test caught — worth understanding

The first run showed **six invitations on the dashboard of a user who owns
none**.

`listManagedEvents()` had no `where` clause. That was correct under Supabase:
RLS restricted it inside the database, and adding an owner filter would have
broken the agent and admin views, which are meant to see more than their own
rows. But with `AUTH_PROVIDER=cognito` there is no Supabase session, so the
**anonymous** grant applied instead — and the anon policy permits reading
published events.

Nothing about the code looked wrong, because **the filtering was never in the
code**. No type error could have caught it, and no unit test was watching. It
took loading the page as a real user.

That is the whole risk of leaving RLS, in one concrete example. Every query that
looks unfiltered needs checking against the same question: *what was doing the
filtering, and does it still exist?*

## What the switch does *not* cover

Be clear about this before concluding "AWS works":

| Still Supabase in both modes | Why |
| --- | --- |
| ~~Sign-in~~ | **Ported.** `AUTH_PROVIDER=cognito` |
| Google sign-in | Federation not configured on the pool — the button is hidden in Cognito mode rather than starting a Supabase flow the app cannot read |
| Partner/agent signup | Refused in Cognito mode: the agent and referral records have no repository, and dropping a referral silently is worse than declining |
| Everything else on a dashboard (guest lists, RSVPs, stats, the builder) | Still Supabase queries |
| **RSVPs, wishes, orders, payments** | No repositories yet |
| **View tracking** (`/api/track`) | Counters are defined but the dedup semantics differ; porting it would silently change what "a view" means |
| **Photographs** | `assetUrl()` still builds a Supabase Storage URL — with `DATA_PROVIDER=aws` the data is DynamoDB but the images are not |
| **The whole marketing site, showcase, themes** | Read through `src/lib/cache.ts`, untouched |

`DATA_PROVIDER=aws` currently switches **one thing: the guest invitation read.**
That is a real, verified milestone and it is nowhere near the whole product.

## Deploying to AWS — not yet verified

`sst.config.ts` and `.github/workflows/deploy-aws.yml` exist and typecheck, but
**neither has ever been run.** They need, first:

1. An OIDC role for GitHub Actions (`AWS_DEPLOY_ROLE_ARN`)
2. The repository secrets listed in the workflow
3. `npx sst deploy --stage dev` succeeding once, by hand, from your machine

Until then Vercel remains the only real deployment, and the workflow is a
proposal rather than a pipeline. Treat the first `sst deploy` as an experiment
that will probably need two or three attempts.
