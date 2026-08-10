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
import { authProviderName } from "@/lib/auth/provider";

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

  if (authProviderName() === "cognito") return cognitoSignInAction(parsed.data, formData);

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

  if (authProviderName() === "cognito") {
    return cognitoSignUpAction({ email, password, fullName, role });
  }

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
  if (authProviderName() === "cognito") {
    const { clearSession } = await import("@aws/auth/session");
    await clearSession();
    revalidatePath("/", "layout");
    redirect("/");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) await captureServer(user.id, EVENTS.signed_out);

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}


/* ------------------------------------------------------------------ Cognito */

/**
 * Cognito sign-up.
 *
 * Ends at a confirmation *code* rather than a magic link — Cognito's default,
 * and a real behavioural difference from Supabase. The form therefore has to
 * send people to /confirm to type six digits, which is why this returns a
 * redirect instead of the "check your email" notice the Supabase branch uses.
 *
 * `phone`, `agencyName` and `referralCode` are accepted by the form but not yet
 * stored: the partner records they feed live in tables with no repository yet.
 * Dropping them silently would lose a referral, so agents are refused for now
 * rather than half-registered.
 */
async function cognitoSignUpAction(input: {
  email: string;
  password: string;
  fullName: string;
  role: "host" | "agent";
}): Promise<AuthState> {
  if (input.role === "agent") {
    return {
      error:
        "Partner signup isn't available on the new backend yet. Please sign up as a host for now.",
    };
  }

  const { cognitoSignUp } = await import("@aws/auth/cognito");
  const result = await cognitoSignUp(input);

  if (!result.ok) {
    log.warn("cognito signup failed", { reason: result.code });
    return { error: result.error };
  }

  redirect(`/confirm?email=${encodeURIComponent(input.email)}`);
}

async function cognitoSignInAction(
  creds: { email: string; password: string },
  formData: FormData
): Promise<AuthState> {
  const { cognitoSignIn } = await import("@aws/auth/cognito");
  const result = await cognitoSignIn(creds.email, creds.password);

  if (!result.ok) {
    // An unconfirmed account is the one failure worth being specific about:
    // "wrong password" would send someone hunting for a typo when the fix is
    // sitting in their inbox.
    if (result.code === "UserNotConfirmedException") {
      redirect(`/confirm?email=${encodeURIComponent(creds.email)}`);
    }
    return { error: result.error };
  }

  const { setSession } = await import("@aws/auth/session");
  await setSession(result.data, creds.email);

  const { ensureProfile } = await import("@aws/repo/profiles");
  const profile = await ensureProfile({ userId: subFrom(result.data.IdToken), email: creds.email });

  revalidatePath("/", "layout");
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : homeFor(profile.role));
}

/**
 * The `sub` out of an id token, without verifying it.
 *
 * Safe only because this token came straight from Cognito over TLS moments ago
 * — it was never in the browser's hands. Anywhere a token arrives from a client
 * it must be verified instead; see `verifyAccessToken` in aws/auth/session.ts.
 */
function subFrom(idToken: string | undefined): string {
  if (!idToken) throw new Error("Cognito returned no id token");
  const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64").toString());
  return payload.sub as string;
}

/** Confirm a sign-up with the six-digit code Cognito emailed. */
export async function confirmSignUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  if (!email || !/^\d{6}$/.test(code)) {
    return { error: "Enter the six-digit code from your email." };
  }

  const { cognitoConfirmSignUp } = await import("@aws/auth/cognito");
  const result = await cognitoConfirmSignUp(email, code);
  if (!result.ok) return { error: result.error };

  redirect(`/login?confirmed=1&email=${encodeURIComponent(email)}`);
}

/** Send the code again, for the inbox where the first one did not arrive. */
export async function resendCode(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  if (!email) return { error: "Enter your email address." };

  const { cognitoResendCode } = await import("@aws/auth/cognito");
  const result = await cognitoResendCode(email);
  return result.ok ? { notice: `A new code is on its way to ${email}.` } : { error: result.error };
}


/* ---------------------------------------------------------- password reset */

/**
 * Ask for a reset. Cognito emails a six-digit code; Supabase emails a link.
 *
 * Reports the same thing whether or not the address exists. A form that says
 * "no such account" is an account enumeration oracle — it lets anyone check
 * which of a list of addresses is registered here, which is exactly what a
 * credential-stuffing run wants to know first.
 */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };
  const email = parsed.data;

  if (authProviderName() === "cognito") {
    const { cognitoForgotPassword } = await import("@aws/auth/cognito");
    const result = await cognitoForgotPassword(email);
    if (!result.ok) return { error: result.error };
    redirect(`/reset?email=${encodeURIComponent(email)}`);
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
  });

  return { notice: `If ${email} has an account, a reset link is on its way.` };
}

/** Finish a Cognito reset: code plus the new password. */
export async function resetPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !/^\d{6}$/.test(code)) {
    return { error: "Enter the six-digit code from your email." };
  }
  const pw = passwordSchema.safeParse(password);
  if (!pw.success) return { error: firstError(pw.error) };

  const { cognitoConfirmForgotPassword } = await import("@aws/auth/cognito");
  const result = await cognitoConfirmForgotPassword(email, code, pw.data);
  if (!result.ok) return { error: result.error };

  redirect(`/login?reset=1&email=${encodeURIComponent(email)}`);
}
