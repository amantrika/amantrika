"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { homeFor } from "@/lib/auth";
import { siteUrl } from "@/lib/env";

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

  if (error) return { error: error.message };

  // No session means the project requires email confirmation.
  if (!data.session) {
    return { notice: `Check ${email} for a confirmation link to finish signing up.` };
  }

  revalidatePath("/", "layout");
  redirect(homeFor(role));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
