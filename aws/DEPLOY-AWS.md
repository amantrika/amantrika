# Deploying to AWS

Two routes exist. **Run one, not both** — two pipelines deploying the same commit
will fight over the same domain.

| | GitHub Actions + SST | Amplify Hosting |
| --- | --- | --- |
| Config lives in | the repo (`sst.config.ts`) | the AWS console |
| Needs an IAM role | yes (done) | no |
| Needs a console click | no | yes, to authorize the GitHub App |
| Control over CloudFront | full | limited |

## What already exists

| Thing | Value |
| --- | --- |
| OIDC provider | `token.actions.githubusercontent.com` |
| Deploy role | `arn:aws:iam::477977196441:role/amantrika-github-deploy` |
| Role trust | `repo:amantrika/amantrika:*` |
| Role policy | `PowerUserAccess` — deliberately **not** Administrator |
| Repo secrets | 12, set via `gh` |
| Repo variable | `STACK=vercel` |

`PowerUserAccess` can build everything but cannot create IAM users, change
account settings, touch billing or close the account. That is the right ceiling
for a role any push to a branch can assume.

**One known limitation:** PowerUser denies `iam:CreateRole`, and SST needs to
create the Lambda execution role. If a deploy fails with an IAM error, add a
narrow inline policy allowing `iam:*Role*` scoped to `amantrika-*` rather than
promoting the role to Administrator.

## Deploying from your machine

The awkward part, and it will bite anyone who does this again:

**SST cannot see `aws login` credentials.** The AWS CLI v2 stores that session in
a format only the CLI resolves; the Go SDK behind Pulumi looks for
`~/.aws/credentials` or an SSO cache, finds neither, and reports
"AWS credentials are not configured" — which reads like you never logged in.

Bridge it without creating any long-lived key:

```bash
set -a; source .env.local; set +a
eval "$(aws configure export-credentials --format env)"
npx sst deploy --stage dev
```

**And those exported credentials expire in about thirty minutes.** The CLI
refreshes its own session transparently; the exported snapshot does not. The
first attempt died with `ExpiredToken` partway through, because downloading the
Pulumi providers ate the window before any resource was created.

So: export immediately before deploying, and expect a long first run to fail on
expiry at least once. Providers are cached after the first attempt, which makes
the retry much faster. If it keeps expiring, **push to CI instead** — GitHub
Actions assumes the role through OIDC and gets a fresh one-hour credential,
which is the whole reason that path exists.

**A failed deploy leaves a state lock**, and the next attempt reports
"A concurrent update was detected on the app" rather than anything about the
original failure. Clear it before retrying:

```bash
npx sst unlock --stage dev
```

## ⛔ CloudFront is blocked until AWS verifies the account

Hit 10 Aug 2026 on the fourth deploy attempt, after everything else had built:

```
CloudFront: CreateDistributionWithTags — 403 AccessDenied
Your account must be verified before you can add new CloudFront resources.
To verify your account, please contact AWS Support.
```

This is not a permissions problem and not fixable in code. New AWS accounts
cannot create CloudFront distributions until Support verifies them — an
anti-abuse measure, since a CDN is the classic thing a fraudulent account spins
up. PowerUserAccess, root, and every policy change are all irrelevant to it.

**Only the account owner can clear it**, and it cannot be automated: the AWS
Support API requires a paid support plan (`SubscriptionRequiredException` on
Basic), so there is no CLI path.

### How to clear it

1. <https://console.aws.amazon.com/support/home#/case/create>
2. Type **Account and billing** — free on the Basic plan. *(Technical support
   would be the wrong queue and does cost money.)*
3. Service **Account**, category **Other Account Issues**
4. Paste the error verbatim, including the request id:
   `RequestID: 4d7ff3b3-bbce-487c-89bb-d37d5274fc15`
5. Say what it is for: a Next.js site on CloudFront + Lambda for a digital
   invitations product.

Usually cleared within a few hours to a day. Once it is, re-run the deploy —
everything else is already built and SST will reuse it.

### What did deploy before it stopped

| Resource | State |
| --- | --- |
| S3 assets bucket `amantrika-dev-amantrikaassetsbucket-…` | created |
| SST state + asset buckets | created |
| CloudFront cache policy, CloudFront Function | created |
| EventBridge cron rule | created |
| CloudFront distribution | **blocked** |
| Lambda server function | not reached |

So the config itself works. Only the distribution is refused.

### The workaround, if waiting is not acceptable

**Amplify Hosting does not hit this**, because the CloudFront distribution
belongs to AWS's own account rather than yours. `amplify.yml` is committed and
ready; connecting the repo is a console step (see `aws/DECISIONS.md` §4).

## Deploying from GitHub

The workflow runs on push to `main`, or manually. `workflow_dispatch` requires
the workflow file to exist on the **default branch**, so while this work lives on
`aws-migration` the manual trigger is unavailable — merge to `main` first, or
deploy locally.

Note what merging to `main` also does: **it deploys production on Vercel.** That
is fine — the AWS deploy goes to its own SST-generated URL and touches no DNS —
but it is not a no-op, so do it deliberately.

## The stage matters

```bash
npx sst deploy --stage dev     # throwaway; removal: remove
npx sst deploy --stage prod    # removal: retain, protect: true
```

`prod` retains resources on `sst remove` and is protected, so a mistaken removal
cannot take the table with it. The DynamoDB table is also protected at the AWS
level; two locks cost nothing and this is the cheaper mistake to make.

## After a successful deploy

1. Open the URL SST prints and click through: marketing, an invitation, login.
2. Only then set the repo variable to the AWS stack:
   ```bash
   gh variable set STACK --body aws --repo amantrika/amantrika
   ```
   One change at a time — first *where it runs*, then *what it runs on* — so a
   failure has one possible cause.
3. DNS stays on Vercel and is not touched by any of this. The cutover is a
   separate, deliberate step.
