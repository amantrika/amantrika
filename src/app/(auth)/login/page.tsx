import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "../AuthShell";
import { authProviderName } from "@/lib/auth/provider";
import { LoginForm } from "./LoginForm";
import { AuthDivider, GoogleButton } from "../GoogleButton";
import { getProfile, homeFor } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in · Amantrika",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const profile = await getProfile();
  if (profile) redirect(homeFor(profile.role));

  const { next } = await searchParams;

  // Google federation is not configured on the Cognito pool yet, and the
  // Supabase OAuth flow would mint a session this backend cannot read.
  const showGoogle = authProviderName() === "supabase";

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your invitations, guests and RSVPs."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="text-primary underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      {showGoogle && (
        <>
          <GoogleButton next={next} label="Sign in with Google" />
          <AuthDivider />
        </>
      )}
      <LoginForm next={next && next.startsWith("/") ? next : ""} />
    </AuthShell>
  );
}
