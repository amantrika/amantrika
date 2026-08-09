/**
 * Create a demo account with a populated invitation, on AWS.
 *
 *   npx tsx --conditions=react-server scripts/aws-demo-data.ts
 *   npx tsx --conditions=react-server scripts/aws-demo-data.ts --clean   # remove it
 *
 *   demo@gmail.com / Demo@123
 *
 * Idempotent: re-running updates rather than duplicating.
 *
 * ## Why the password is set by an admin call, not by signing up
 *
 * A real sign-up would email a six-digit code to `demo@gmail.com` — an address
 * we do not control and should not be mailing. `admin-create-user` with
 * `MessageAction=SUPPRESS` plus `admin-set-user-password --permanent` produces
 * the same confirmed user with nobody's inbox involved.
 *
 * **This is a demo account on a real pool.** It is deliberately weak by design
 * so it can be shared, which is exactly why it must never exist in an
 * environment holding real customer data. Delete it before launch: `--clean`.
 */
import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { awsRegion, cognitoUserPoolId } from "../src/lib/aws/env";
import { ensureProfile, getProfile } from "../src/lib/aws/repo/profiles";
import {
  createInvite,
  getInviteForOwner,
  isSlugAvailable,
  publishInvite,
  replaceSubEvents,
  updateInvite,
} from "../src/lib/aws/repo/invites";
import { registerAsset, listAssets } from "../src/lib/aws/repo/assets";
import { MEDIA_BUCKET, mediaKey, mediaUrl } from "../src/lib/aws/storage";

const EMAIL = "demo@gmail.com";
const PASSWORD = "Demo@123";
const SLUG = "demo-meera-weds-arjun";
const CLEAN = process.argv.includes("--clean");

const idp = new CognitoIdentityProviderClient({ region: awsRegion });
const s3 = new S3Client({ region: awsRegion });

async function findUser(): Promise<string | null> {
  try {
    const res = await idp.send(
      new AdminGetUserCommand({ UserPoolId: cognitoUserPoolId(), Username: EMAIL })
    );
    return res.UserAttributes?.find((a) => a.Name === "sub")?.Value ?? null;
  } catch {
    return null;
  }
}

/** A 1×1 PNG per colour. Enough to prove the pipeline without shipping binaries. */
function swatch(hex: string): Buffer {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const raw = Buffer.from([0, r, g, b, 255]);
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const zlib = require("node:zlib") as typeof import("node:zlib");
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function clean() {
  const sub = await findUser();
  if (!sub) {
    console.log("No demo user to remove.");
    return;
  }
  await idp.send(
    new AdminDeleteUserCommand({ UserPoolId: cognitoUserPoolId(), Username: EMAIL })
  );
  console.log(`Deleted the Cognito user. DynamoDB items under USER#${sub} remain —`);
  console.log("delete them by hand if the invitation should go too.");
}

async function main() {
  if (CLEAN) return clean();

  console.log(`Pool ${cognitoUserPoolId()}\n`);

  /* 1. The account */
  let sub = await findUser();
  if (sub) {
    console.log(`1. user exists            ${EMAIL}`);
  } else {
    const created = await idp.send(
      new AdminCreateUserCommand({
        UserPoolId: cognitoUserPoolId(),
        Username: EMAIL,
        MessageAction: "SUPPRESS",
        UserAttributes: [
          { Name: "email", Value: EMAIL },
          { Name: "email_verified", Value: "true" },
          { Name: "custom:full_name", Value: "Demo Host" },
        ],
      })
    );
    sub = created.User?.Attributes?.find((a) => a.Name === "sub")?.Value ?? null;
    console.log(`1. user created           ${EMAIL}`);
  }
  if (!sub) throw new Error("no sub for the demo user");

  await idp.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: cognitoUserPoolId(),
      Username: EMAIL,
      Password: PASSWORD,
      Permanent: true,
    })
  );
  console.log(`   password set           ${PASSWORD}`);

  /* 2. The profile */
  await ensureProfile({ userId: sub, email: EMAIL, fullName: "Demo Host" });
  console.log(`2. profile                ${(await getProfile(sub))?.role}`);

  /* 3. The invitation */
  const free = await isSlugAvailable(SLUG);
  let eventId: string;
  if (free) {
    const invite = await createInvite(sub, {
      title: "Meera & Arjun",
      slug: SLUG,
      eventType: "wedding",
      themeId: "royal-maroon",
      timezone: "Asia/Kolkata",
      planCode: "free",
    });
    eventId = invite.id;
    console.log(`3. invitation created     /invite/${SLUG}`);
  } else {
    // Re-run: find it through the owner index rather than guessing.
    const { listInvitesForOwner } = await import("../src/lib/aws/repo/invites");
    const mine = await listInvitesForOwner(sub);
    eventId = mine.find((i) => i.slug === SLUG)?.id ?? "";
    if (!eventId) throw new Error(`${SLUG} exists but is not owned by the demo user`);
    console.log(`3. invitation exists      /invite/${SLUG}`);
  }

  const inThreeMonths = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString();

  await updateInvite(sub, eventId, {
    title: "Meera & Arjun",
    city: "Udaipur",
    hashtag: "#MeeraWedsArjun",
    mainDateTime: inThreeMonths,
    story:
      "They met over filter coffee in a Bangalore bookshop, argued about the ending of a novel, and have been arguing happily ever since.",
    hosts: [
      { name: "Meera", family: "The Iyer Family" },
      { name: "Arjun", family: "The Nair Family" },
    ],
    hotels: [
      { name: "Taj Lake Palace", address: "Pichola, Udaipur", note: "Rooms held until the 20th" },
    ],
    storyMoments: [
      { title: "The bookshop", date: "2021", text: "A disagreement about a last chapter." },
      { title: "The question", date: "2025", text: "Asked at the same table, coffee gone cold." },
    ],
  });

  await replaceSubEvents(sub, eventId, [
    { key: "haldi", name: "Haldi", startsAt: inThreeMonths, timeLabel: "10:00 AM", venue: "Family home", address: "Sector 4, Udaipur", dressCode: "Yellow" },
    { key: "mehndi", name: "Mehndi", startsAt: inThreeMonths, timeLabel: "4:00 PM", venue: "Courtyard", address: "Taj Lake Palace, Udaipur", dressCode: "Festive" },
    { key: "ceremony", name: "Wedding ceremony", startsAt: inThreeMonths, timeLabel: "7:30 PM", venue: "Lakeside Lawn", address: "Taj Lake Palace, Udaipur", dressCode: "Traditional" },
  ]);
  console.log("   3 ceremonies");

  /* 4. Media, actually uploaded to S3 */
  const existing = await listAssets(sub, eventId);
  if (existing.length === 0) {
    for (const [i, colour] of ["#7b1e2b", "#c9a227", "#1f6f5c"].entries()) {
      const assetId = crypto.randomUUID();
      const key = mediaKey(eventId, assetId, "image/png");
      await s3.send(
        new PutObjectCommand({
          Bucket: MEDIA_BUCKET,
          Key: key,
          Body: swatch(colour),
          ContentType: "image/png",
        })
      );
      await registerAsset(sub, {
        eventId,
        assetId,
        storageKey: key,
        kind: "photo",
        fileName: `demo-${i + 1}.png`,
      });
    }
    console.log(`4. 3 photos uploaded      s3://${MEDIA_BUCKET}/invites/${eventId}/photos/`);
  } else {
    console.log(`4. ${existing.length} photos already present`);
    console.log(`   ${mediaUrl(existing[0].storagePath)}`);
  }

  /* 5. Publish, so a guest can open it */
  await publishInvite(sub, eventId);
  const invite = await getInviteForOwner(sub, eventId);
  console.log(`5. status                 ${invite?.status}`);

  console.log(`\nSign in with  ${EMAIL} / ${PASSWORD}`);
  console.log(`Guest link    /invite/${SLUG}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
