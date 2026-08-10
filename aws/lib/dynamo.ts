import "server-only";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { awsRegion } from "@aws/env";

/**
 * The one DynamoDB client for the process.
 *
 * Module scope, not per-request: in Lambda the module is evaluated once per
 * container and reused across invocations, so a client created here keeps its
 * HTTPS connections warm between requests. Creating one per request would pay a
 * TLS handshake on every page view — the single easiest way to make a
 * serverless app feel slow.
 *
 * No credentials are passed. The SDK resolves them from the environment: the
 * execution role in Lambda, the `aws login` session locally. There is
 * deliberately no key to configure and none to leak.
 */
const base = new DynamoDBClient({
  region: awsRegion,
  // Fail fast rather than hanging a page render. A Dynamo call that has not
  // answered in three seconds is not going to; better a caught error and a
  // retry than a request that ties up a Lambda for its whole timeout.
  requestHandler: { requestTimeout: 3_000 },
  maxAttempts: 3,
});

/**
 * The Document client wraps the raw API so items are plain JavaScript objects
 * instead of `{ S: "…" }` attribute-value soup. Everything in `repo/` uses this.
 *
 * `removeUndefinedValues` matters more than it looks: DynamoDB rejects an
 * explicit `undefined`, and optional fields on a partially-filled invitation
 * draft are undefined constantly. Without this, saving a draft that omits one
 * optional field throws.
 */
export const ddb = DynamoDBDocumentClient.from(base, {
  marshallOptions: {
    removeUndefinedValues: true,
    // Empty strings are legal in DynamoDB and mean something different from
    // absent — a cleared form field, for example. Keep them.
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    // Numbers stay numbers. The alternative returns BigInt-ish wrappers that
    // break JSON serialisation to Client Components.
    wrapNumbers: false,
  },
});
