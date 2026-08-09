import "server-only";

/**
 * AWS configuration. Server-only by construction — this module imports
 * `server-only`, so a client component that pulls it in fails the build rather
 * than shipping a table name and a user-pool id to the browser.
 *
 * None of these are secrets in the Supabase sense: there is no equivalent of
 * the service-role key here. Access is granted by the *IAM role the code runs
 * as* — the Lambda's execution role in production, your `aws login` session
 * locally — not by a string in an environment variable. That is a genuine
 * improvement: there is no longer a credential that can leak into a client
 * bundle, because there is no credential.
 *
 * The consequence is that `CLAUDE.md` §2.7 changes shape. "The service-role key
 * never leaves Route Handlers" becomes "the table is reachable only from code
 * running under the app's IAM role, and only through `repo/`".
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`
    );
  }
  return value;
}

/** Region for every AWS call. Co-located with the database; see aws/PLAN.md. */
export const awsRegion = process.env.AWS_REGION ?? "ap-southeast-1";

/**
 * The single DynamoDB table. Everything lives here — see aws/DATA-MODEL.md for
 * why one table rather than seventeen.
 */
export const tableName = process.env.AMANTRIKA_TABLE ?? "amantrika";

/** Cognito user pool holding hosts, partners and admins. */
export function cognitoUserPoolId(): string {
  return required("COGNITO_USER_POOL_ID", process.env.COGNITO_USER_POOL_ID);
}

export function cognitoClientId(): string {
  return required("COGNITO_CLIENT_ID", process.env.COGNITO_CLIENT_ID);
}

/**
 * The app client was created with a secret, which makes it a *confidential*
 * client: every auth call is signed with this, so a stolen client id alone
 * cannot mint tokens. It is therefore a real secret and must never reach the
 * browser — which is why the whole module is `server-only`.
 */
export function cognitoClientSecret(): string {
  return required("COGNITO_CLIENT_SECRET", process.env.COGNITO_CLIENT_SECRET);
}
