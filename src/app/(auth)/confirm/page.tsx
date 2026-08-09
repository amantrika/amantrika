import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "../AuthShell";
import { ConfirmForm } from "./ConfirmForm";
import { authProviderName } from "@/lib/auth/provider";

export const metadata: Metadata = {
  title: "Confirm your email · Amantrika",
  robots: { index: false },
};

/**
 * Only reachable on the Cognito backend. Under Supabase, confirmation is a link
 * in an email that lands on `/auth/callback`, so this page would be a dead end
 * that collects a code nothing can verify — better to send people back to
 * signup than to show them a form that cannot work.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  if (authProviderName() !== "cognito") redirect("/signup");

  const { email } = await searchParams;
  if (!email) redirect("/signup");

  return (
    <AuthShell
      title="Check your email"
      subtitle={`We sent a six-digit code to ${email}. Enter it below to finish signing up.`}
      footer={
        <>
          Wrong address?{" "}
          <Link href="/signup" className="text-primary underline underline-offset-4">
            Start again
          </Link>
        </>
      }
    >
      <ConfirmForm email={email} />
    </AuthShell>
  );
}
