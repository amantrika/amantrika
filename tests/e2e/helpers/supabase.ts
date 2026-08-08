import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

/**
 * Every row these tests create is prefixed, and global teardown deletes
 * everything carrying the prefix. Tests run against the same project the app
 * develops against, so anything unprefixed is somebody's real work — never
 * delete by "created recently" or by table truncation.
 */
export const E2E_PREFIX = "e2e-";

export function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "E2E tests need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type TestHost = {
  userId: string;
  email: string;
  password: string;
};

/**
 * Creates a confirmed host directly through the Admin API.
 *
 * Signup through the UI can't be used: `enable_confirmations = true` means a
 * real address would have to receive and click a link. The login *form* is
 * still exercised by the auth spec — only account creation is shortcut here.
 */
export async function createTestHost(): Promise<TestHost> {
  const email = `${E2E_PREFIX}${randomUUID().slice(0, 8)}@amantrika-e2e.test`;
  const password = `E2e!${randomUUID().slice(0, 12)}`;

  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "E2E Test Host", role: "host" },
  });

  if (error || !data.user) {
    throw new Error(`Could not create the test host: ${error?.message}`);
  }

  return { userId: data.user.id, email, password };
}

/** A draft invitation owned by `host`, ready to be taken through checkout. */
export async function createDraftEvent(host: TestHost, overrides: Record<string, unknown> = {}) {
  const slug = `${E2E_PREFIX}${randomUUID().slice(0, 8)}`;

  const { data, error } = await admin()
    .from("events")
    .insert({
      slug,
      owner_id: host.userId,
      title: "E2E Test Celebration",
      event_type: "wedding",
      status: "draft",
      hosts: [{ name: "Asha", family: "Rao", role: "bride" }],
      // Far enough out that the early-bird ladder would engage, so a test that
      // enables it has something to assert against.
      main_datetime: new Date(Date.now() + 300 * 86_400_000).toISOString(),
      city: "Jaipur",
      ...overrides,
    })
    .select("id, slug")
    .single();

  if (error || !data) throw new Error(`Could not create the test event: ${error?.message}`);
  return data;
}

export async function createPendingOrder(host: TestHost, eventId: string, planCode = "classic") {
  const { data: plan } = await admin()
    .from("plans")
    .select("code, price_inr")
    .eq("code", planCode)
    .single();

  const { data, error } = await admin()
    .from("orders")
    .insert({
      event_id: eventId,
      buyer_id: host.userId,
      plan_code: planCode,
      amount_inr: plan!.price_inr,
      currency: "INR",
      status: "pending",
      provider: "mock",
    })
    .select("id, amount_inr")
    .single();

  if (error || !data) throw new Error(`Could not create the test order: ${error?.message}`);
  return data;
}

export async function getEvent(id: string) {
  const { data } = await admin()
    .from("events")
    .select("id, slug, status, published_at")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function getOrder(id: string) {
  const { data } = await admin()
    .from("orders")
    .select("id, status, paid_at, provider_payment_id, failure_reason")
    .eq("id", id)
    .maybeSingle();
  return data;
}

/**
 * Removes every prefixed row. Deleting the auth user cascades to its profile,
 * events and orders; the webhook ledger is cleared first because its order
 * reference is `on delete set null`, which would otherwise orphan rows.
 */
export async function cleanupE2EData(): Promise<{ users: number; events: number }> {
  const supabase = admin();

  const { data: events } = await supabase
    .from("events")
    .select("id")
    .like("slug", `${E2E_PREFIX}%`);

  const eventIds = (events ?? []).map((e) => e.id);

  if (eventIds.length > 0) {
    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .in("event_id", eventIds);

    const orderIds = (orders ?? []).map((o) => o.id);
    if (orderIds.length > 0) {
      await supabase.from("payment_events").delete().in("order_id", orderIds);
    }

    await supabase.from("events").delete().in("id", eventIds);
  }

  // Test users are found through `profiles` rather than
  // `auth.admin.listUsers()`. That endpoint used to error project-wide (NULL
  // GoTrue token columns, fixed in migration 20260808130223) and it now works —
  // but a prefix match on a table we control is still narrower than listing
  // every account and filtering client-side. `profiles.id` is the auth user id,
  // and deleting the auth user cascades back through the profile.
  const { data: testProfiles } = await supabase
    .from("profiles")
    .select("id, email")
    .like("email", `${E2E_PREFIX}%`);

  let removedUsers = 0;
  for (const profile of testProfiles ?? []) {
    const { error } = await supabase.auth.admin.deleteUser(profile.id);
    if (!error) removedUsers += 1;
  }

  return { users: removedUsers, events: eventIds.length };
}
