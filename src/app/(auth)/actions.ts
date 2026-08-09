"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { homeFor } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { captureServer, emailDomain } from "@/lib/posthog/server";
import { log } from "@/lib/posthog/logger";
import { EVENTS } from "@/lib/posthog/events";

export interface AuthState {
  error?: string;
  notice?: string;
}

const emailSchema = z.string().email("Enter a valid email address.");
const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Passwords are limited to 72 characters.");

const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(2, "Tell us your name."),
  phone: z.string().trim().optional(),
  // 'admin' is deliberately absent: the signup trigger downgrades it anyway.
  role: z.enum(["host", "agent"]).default("host"),
  agencyName: z.string().trim().optional(),
  referralCode: z.string().trim().optional(),
});

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1, "Enter your password.") })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  // Deliberately vague: don't confirm whether an address is registered.
  if (error) return { error: "That email and password combination didn't work." };

  const next = String(formData.get("next") ?? "");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  await captureServer(user!.id, EVENTS.signin_completed, {
    role: profile?.role ?? "host",
  });

  revalidatePath("/", "layout");
  redirect(next && next.startsWith("/") ? next : homeFor(profile?.role ?? "host"));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone") || undefined,
    role: formData.get("role") || "host",
    agencyName: formData.get("agencyName") || undefined,
    referralCode: formData.get("referralCode") || undefined,
  });

  if (!parsed.success) return { error: firstError(parsed.error) };
  const { email, password, fullName, phone, role, agencyName, referralCode } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      // handle_new_user() reads this to build the profile and agent records.
      data: {
        full_name: fullName,
        phone: phone ?? null,
        role,
        agency_name: agencyName ?? null,
        referral_code: referralCode ?? null,
      },
    },
  });

  if (error) {
    log.warn("signup failed", { role, reason: error.message });
    return { error: error.message };
  }

  if (data.user) {
    // Only the email *domain* — the address itself never leaves Postgres.
    await captureServer(data.user.id, EVENTS.signup_completed, {
      role,
      email_domain: emailDomain(email),
      has_referral: Boolean(referralCode),
      is_agency: Boolean(agencyName),
      awaiting_confirmation: !data.session,
    });
  }

  // No session means the project requires email confirmation.
  if (!data.session) {
    return { notice: `Check ${email} for a confirmation link to finish signing up.` };
  }

  revalidatePath("/", "layout");
  // Someone who picked a design on the landing page arrives here with that
  // choice in `next`. Sending them to the dashboard instead would ask them to
  // choose it a second time. Validated as a relative path — same rule as
  // `signInWithGoogle` — so a crafted link cannot turn signup into an open
  // redirect.
  const next = String(formData.get("next") ?? "");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";
  redirect(safeNext || homeFor(role));
}

/**
 * Starts the Google OAuth handshake.
 *
 * Supabase returns the URL to send the browser to; the round trip comes back to
 * `/auth/callback`, which exchanges the code for a session. `handle_new_user`
 * then creates the profile exactly as for an email signup — including promoting
 * an allowlisted address straight to admin — so a Google signup and an email
 * signup converge on the same row.
 *
 * `next` is validated as a relative path so this can't be turned into an open
 * redirect by a crafted link.
 */
export async function signInWithGoogle(next?: string): Promise<AuthState> {
  const supabase = await createClient();
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""}`,
      queryParams: {
        // Ask for a refresh token, and let people pick which Google account.
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error || !data?.url) {
    log.warn("google oauth could not start", { reason: error?.message });
    return { error: "Couldn't start Google sign-in. Please try again." };
  }

  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) await captureServer(user.id, EVENTS.signed_out);

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
