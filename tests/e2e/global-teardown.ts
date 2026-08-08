import { cleanupE2EData } from "./helpers/supabase";

/**
 * Runs once after the whole suite, pass or fail. Tests share a live project, so
 * leaving rows behind would slowly turn the dashboard into a graveyard.
 */
export default async function globalTeardown() {
  try {
    const { users, events } = await cleanupE2EData();
    console.log(`\n[e2e cleanup] removed ${users} test user(s) and ${events} test invitation(s).`);
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    console.error(`\n[e2e cleanup] FAILED — prefixed rows may remain: ${reason}`);
  }
}
