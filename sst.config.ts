/// <reference path="./.sst/platform/config.d.ts" />

/**
 * Deploy Amantrika to AWS: CloudFront + Lambda + S3, from this repo.
 *
 * **UNVERIFIED.** This file has never been run. It is written from the SST v3
 * Nextjs component's documented shape and typechecks, but nothing here has
 * created a real distribution, so treat the first `sst deploy` as an experiment
 * rather than a deployment. See `aws/STATUS.md`.
 *
 *   npx sst deploy --stage dev     # a throwaway stage on an SST-generated URL
 *   npx sst deploy --stage prod    # only after dev has been clicked through
 *
 * Vercel stays live throughout. Nothing here touches DNS — the cutover is a
 * separate, deliberate step, and until it happens this deploys to a URL nobody
 * has been given.
 */
export default $config({
  app(input) {
    return {
      name: "amantrika",
      // `retain` on prod means a mistaken `sst remove` cannot take the table
      // with it. The DynamoDB table is also protected at the AWS level, but a
      // second lock costs nothing and this one is the cheaper mistake to make.
      removal: input?.stage === "prod" ? "retain" : "remove",
      protect: input?.stage === "prod",
      home: "aws",
      providers: { aws: { region: "ap-southeast-1" } },
    };
  },

  async run() {
    const table = aws.dynamodb.Table.get("AmantrikaTable", "amantrika");

    const site = new sst.aws.Nextjs("Amantrika", {
      // ARM64 is ~20% cheaper per GB-second than x86 for identical work.
      // There is no downside for a Node runtime, so it is simply the default
      // anyone paying their own bill should choose.
      server: { architecture: "arm64", memory: "1024 MB", timeout: "20 seconds" },

      // Granting the table rather than a wildcard: this role should be able to
      // reach exactly one table and its indexes, so that a mistake elsewhere in
      // the app cannot become a mistake in someone else's data.
      permissions: [
        {
          actions: [
            "dynamodb:GetItem",
            "dynamodb:Query",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem",
            "dynamodb:BatchWriteItem",
            "dynamodb:BatchGetItem",
          ],
          resources: [table.arn, $interpolate`${table.arn}/index/*`],
        },
        { actions: ["ses:SendEmail", "ses:SendRawEmail"], resources: ["*"] },
      ],

      environment: {
        AWS_REGION_APP: "ap-southeast-1",
        AMANTRIKA_TABLE: "amantrika",

        // Starts on Supabase deliberately. A first deploy should change one
        // thing — where the app runs — not two. Flip to "aws" once the deployed
        // site has been checked, so that if something breaks you know which
        // change caused it.
        DATA_PROVIDER: process.env.DATA_PROVIDER ?? "supabase",

        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "",
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
        COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID ?? "",
        COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID ?? "",
        COGNITO_CLIENT_SECRET: process.env.COGNITO_CLIENT_SECRET ?? "",
        CRON_SECRET: process.env.CRON_SECRET ?? "",
        PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER ?? "mock",
        PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET ?? "",
        NEXT_PUBLIC_CLOUDINARY_CLOUD: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD ?? "",
      },
    });

    /**
     * The nightly job Vercel Cron used to run. `vercel.json` keeps its copy
     * until the cutover, because two schedulers firing the same idempotent job
     * is harmless and a gap where neither fires is not.
     */
    new sst.aws.Cron("AbandonedDraft", {
      schedule: "cron(0 9 * * ? *)",
      function: {
        handler: "src/cron/abandoned-draft.handler",
        environment: {
          SITE_URL: site.url,
          CRON_SECRET: process.env.CRON_SECRET ?? "",
        },
      },
    });

    return { url: site.url };
  },
});
