import "server-only";
import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@aws/dynamo";
import { tableName } from "@aws/env";
import {
  EMAIL_GSI1_SK,
  PROFILE_SK,
  emailGsi1Pk,
  userPk,
  ADMIN_PK,
  adminEmailSk,
} from "@aws/keys";
import type { ProfileItem } from "@aws/repo/types";

/**
 * Profiles — what `handle_new_user()` used to do.
 *
 * In Postgres a trigger on `auth.users` created the profile row automatically,
 * so a user and their profile could not exist apart. Cognito has no such hook
 * into DynamoDB, which means **the application must create the profile, and a
 * crash between the two leaves a Cognito user with no profile.**
 *
 * That case is handled by making profile creation idempotent and calling it on
 * sign-in as well as sign-up: a user missing a profile gets one the next time
 * they authenticate, rather than hitting a broken dashboard forever. It is not
 * as good as a trigger. It is what is available.
 */

export async function getProfile(userId: string): Promise<ProfileItem | null> {
  const res = await ddb.send(
    new GetCommand({ TableName: tableName, Key: { PK: userPk(userId), SK: PROFILE_SK } })
  );
  return (res.Item as ProfileItem) ?? null;
}

export async function getProfileByEmail(email: string): Promise<ProfileItem | null> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk AND GSI1SK = :sk",
      ExpressionAttributeValues: { ":pk": emailGsi1Pk(email), ":sk": EMAIL_GSI1_SK },
      Limit: 1,
    })
  );
  return (res.Items?.[0] as ProfileItem) ?? null;
}

/**
 * Roles are assigned here, and `admin` is deliberately not self-assignable —
 * the same rule the Postgres trigger enforced. A signup form that offered
 * "admin" in a dropdown would be trusting the client with the one field it must
 * never control, so the caller may only ask for `host` or `agent`, and the
 * allowlist is the sole route to `admin`.
 */
export async function ensureProfile(input: {
  userId: string;
  email: string;
  fullName?: string;
  role?: "host" | "agent";
}): Promise<ProfileItem> {
  const existing = await getProfile(input.userId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const role = (await isAllowlistedAdmin(input.email)) ? "admin" : (input.role ?? "host");

  const item: ProfileItem = {
    PK: userPk(input.userId),
    SK: PROFILE_SK,
    _type: "profile",
    id: input.userId,
    email: input.email.toLowerCase(),
    fullName: input.fullName,
    role,
    createdAt: now,
    updatedAt: now,
    GSI1PK: emailGsi1Pk(input.email),
    GSI1SK: EMAIL_GSI1_SK,
  };

  // Idempotent: two requests racing to create the same profile leave one item,
  // and the loser reads it back rather than failing the sign-up.
  try {
    await ddb.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );
    return item;
  } catch (error) {
    if ((error as { name?: string }).name === "ConditionalCheckFailedException") {
      return (await getProfile(input.userId)) ?? item;
    }
    throw error;
  }
}

/** The allowlist that promotes a known address to admin on first sign-in. */
async function isAllowlistedAdmin(email: string): Promise<boolean> {
  const res = await ddb.send(
    new GetCommand({
      TableName: tableName,
      Key: { PK: ADMIN_PK, SK: adminEmailSk(email) },
    })
  );
  return Boolean(res.Item);
}
