import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "../AuthShell";
import { LoginForm } from "./LoginForm";
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
      <LoginForm next={next && next.startsWith("/") ? next : ""} />
    </AuthShell>
  );
}
