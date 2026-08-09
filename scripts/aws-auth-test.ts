/**
 * Test Cognito signup end to end, from the terminal.
 *
 *   npx tsx --conditions=react-server scripts/aws-auth-test.ts you@example.com 'YourPassw0rd'
 *
 * Walks the real flow: sign up → Cognito emails a 6-digit code → you paste it →
 * confirm → sign in → a profile appears in DynamoDB. Nothing is mocked.
 *
 * Uses a real inbox on purpose. Cognito's built-in sender delivers to any
 * address but is capped at 50 messages a day, which is plenty for testing and
 * is exactly why it must be replaced by SES before launch.
 *
 * Clean-up: delete the test user with
 *   aws cognito-idp admin-delete-user --user-pool-id <POOL> --username you@example.com
 */
import { createInterface } from "node:readline/promises";
import {
  cognitoConfirmSignUp,
  cognitoSignIn,
  cognitoSignUp,
} from "../src/lib/aws/auth/cognito";
import { ensureProfile, getProfile } from "../src/lib/aws/repo/profiles";

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error(
    "Usage: npx tsx --conditions=react-server scripts/aws-auth-test.ts <email> <password>"
  );
  process.exit(1);
}

async function main() {
  console.log(`\n1. Signing up ${email} …`);
  const signUp = await cognitoSignUp({ email, password, fullName: "Test Host" });
  if (!signUp.ok) {
    console.error(`   FAILED: ${signUp.error}  (${signUp.code})`);
    console.error("   If the user already exists, delete it first — see the header of this file.");
    process.exit(1);
  }
  console.log(`   created. userSub=${signUp.data.userSub}`);
  console.log(`   confirmed=${signUp.data.confirmed}  codeSentTo=${signUp.data.codeSentTo ?? "—"}`);

  if (!signUp.data.confirmed) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const code = (await rl.question("\n2. Paste the 6-digit code from your email: ")).trim();
    rl.close();

    const confirmed = await cognitoConfirmSignUp(email, code);
    if (!confirmed.ok) {
      console.error(`   FAILED: ${confirmed.error}  (${confirmed.code})`);
      process.exit(1);
    }
    console.log("   confirmed.");
  }

  console.log("\n3. Signing in …");
  const session = await cognitoSignIn(email, password);
  if (!session.ok) {
    console.error(`   FAILED: ${session.error}  (${session.code})`);
    process.exit(1);
  }
  console.log(
    `   got tokens. access=${session.data.AccessToken?.slice(0, 18)}…  expires in ${session.data.ExpiresIn}s`
  );

  console.log("\n4. Creating the profile in DynamoDB …");
  const profile = await ensureProfile({
    userId: signUp.data.userSub,
    email,
    fullName: "Test Host",
  });
  console.log(`   role=${profile.role}  id=${profile.id}`);

  console.log("\n5. Reading it back …");
  const readBack = await getProfile(signUp.data.userSub);
  console.log(readBack ? `   found: ${readBack.email} (${readBack.role})` : "   NOT FOUND");

  console.log(
    readBack ? "\nSignup works end to end on AWS.\n" : "\nProfile did not persist — investigate.\n"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
