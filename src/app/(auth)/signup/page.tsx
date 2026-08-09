import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "../AuthShell";
import { authProviderName } from "@/lib/auth/provider";
import { SignUpForm } from "./SignUpForm";
import { AuthDivider, GoogleButton } from "../GoogleButton";
import { getProfile, homeFor } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create your account · Amantrika",
  robots: { index: false },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; as?: string; next?: string }>;
}) {
  const profile = await getProfile();
  if (profile) redirect(homeFor(profile.role));

  const { ref, as, next } = await searchParams;
  // Relative paths only, so a crafted `?next=//evil.example` cannot make signup
  // an open redirect. Same check as the login page.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "";

  // Google federation is not configured on the Cognito pool yet, and the
  // Supabase OAuth flow would mint a session this backend cannot read.
  const showGoogle = authProviderName() === "supabase";

  return (
    <AuthShell
      title="Begin your invitation"
      subtitle="One account for every celebration you host — or every client you serve."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-primary underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      {showGoogle && (
        <>
          <GoogleButton next={safeNext} label="Sign up with Google" />
          <AuthDivider />
        </>
      )}
      <SignUpForm
        referralCode={ref ?? ""}
        initialRole={as === "agent" ? "agent" : "host"}
        next={safeNext}
      />
    </AuthShell>
  );
}
