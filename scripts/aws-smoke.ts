/**
 * Smoke test for the DynamoDB repository layer, run against the real table.
 *
 * Not a unit test — it proves the key design works end to end: that an
 * invitation can be written, found by slug on GSI1, listed by owner on GSI2,
 * and **that a second user cannot read it**. That last assertion is the one
 * that matters most, because it is the check that replaced 55 RLS policies.
 *
 *   npx tsx --conditions=react-server scripts/aws-smoke.ts
 *
 * Cleans up after itself. Safe to re-run.
 */
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../src/lib/aws/dynamo";
import { tableName } from "../src/lib/aws/env";
import { META_SK, eventPk } from "../src/lib/aws/keys";
import {
  createInvite,
  getInviteForOwner,
  getPublishedInviteBySlug,
  listInvitesForOwner,
  updateInvite,
} from "../src/lib/aws/repo/invites";

const OWNER = "smoke-owner-" + Math.floor(Number(process.hrtime.bigint() % 1000000n));
const INTRUDER = "smoke-intruder";
const slug = `smoke-${OWNER}`;

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}`);
  if (!ok) failures++;
}

async function main() {
  console.log(`table=${tableName} owner=${OWNER}\n`);

  const invite = await createInvite(OWNER, {
    title: "Ravi & Priya",
    slug,
    eventType: "wedding",
    themeId: "royal-maroon",
    timezone: "Asia/Kolkata",
    planCode: "basic",
  });
  check("createInvite returns an id", Boolean(invite.id));

  const mine = await getInviteForOwner(OWNER, invite.id);
  check("owner can read their own invitation", mine?.id === invite.id);

  const theirs = await getInviteForOwner(INTRUDER, invite.id);
  check("NON-OWNER IS REFUSED (this is the RLS replacement)", theirs === null);

  const listed = await listInvitesForOwner(OWNER);
  check("GSI2 lists the invitation for its owner", listed.some((i) => i.id === invite.id));

  const draft = await getPublishedInviteBySlug(slug);
  check("a draft is invisible to guests", draft === null);

  const patched = await updateInvite(OWNER, invite.id, { city: "Jaipur" });
  check("owner can update", patched === true);

  const denied = await updateInvite(INTRUDER, invite.id, { city: "Nowhere" });
  check("NON-OWNER CANNOT UPDATE", denied === false);

  const after = await getInviteForOwner(OWNER, invite.id);
  check("the intruder's write did not land", after?.city === "Jaipur");

  // Publish by hand — the publish flow itself is not ported yet.
  await updateInvite(OWNER, invite.id, {} as never);
  await ddb.send(
    new (await import("@aws-sdk/lib-dynamodb")).UpdateCommand({
      TableName: tableName,
      Key: { PK: eventPk(invite.id), SK: META_SK },
      UpdateExpression: "SET #s = :s",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":s": "published" },
    })
  );

  const published = await getPublishedInviteBySlug(slug);
  check("published invitation is found by slug on GSI1", published?.invite.id === invite.id);
  check(
    "public projection omits ownerId",
    published !== null && !("ownerId" in (published.invite as object))
  );

  await ddb.send(
    new DeleteCommand({ TableName: tableName, Key: { PK: eventPk(invite.id), SK: META_SK } })
  );
  const gone = await getInviteForOwner(OWNER, invite.id);
  check("cleanup removed the test item", gone === null);

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} CHECK(S) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
