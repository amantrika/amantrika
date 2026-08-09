/**
 * One variable chooses the whole stack.
 *
 *   STACK=vercel   Vercel + Supabase + Resend + Cloudinary   (default)
 *   STACK=aws      AWS: Lambda/CloudFront + DynamoDB + Cognito + SES + S3
 *
 * ## Why a single switch on top of the per-service ones
 *
 * `DATA_PROVIDER` and `AUTH_PROVIDER` exist because data and identity have to
 * be able to move independently — they fail in completely different ways, and
 * during the migration one is often ahead of the other. But that is a
 * *migration* concern. Day to day nobody wants to remember which four variables
 * make a coherent stack, and a half-set combination (Cognito sessions against
 * Supabase data) is a configuration that should never ship.
 *
 * So `STACK` sets the defaults for all of them, and the per-service variables
 * remain as overrides for exactly the case they were built for: testing one
 * half of the migration against the other.
 *
 * Defaults to `vercel` because that is what is live. A missing or mistyped
 * value must degrade to the thing that works.
 *
 * Safe to import from client components — it reads no secrets.
 */
export type StackName = "vercel" | "aws";

export function stackName(): StackName {
  return process.env.STACK === "aws" ? "aws" : "vercel";
}

/**
 * Resolve one service, honouring an explicit override before the stack default.
 *
 * The override wins deliberately: `STACK=aws DATA_PROVIDER=supabase` is a
 * legitimate thing to run — Cognito sessions against Postgres data — while you
 * are moving one surface at a time.
 */
export function resolveProvider<T extends string>(
  override: string | undefined,
  choices: { vercel: T; aws: T }
): T {
  if (override === choices.vercel) return choices.vercel;
  if (override === choices.aws) return choices.aws;
  return stackName() === "aws" ? choices.aws : choices.vercel;
}
