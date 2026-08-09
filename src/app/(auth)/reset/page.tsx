import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "../AuthShell";
import { ResetForm } from "./ResetForm";
import { authProviderName } from "@/lib/auth/provider";

export const metadata: Metadata = {
  title: "Set a new password · Amantrika",
  robots: { index: false },
};

/**
 * Cognito only. Supabase resets through an emailed link that lands on
 * `/auth/callback`, so this code-entry form would have nothing to verify.
 */
export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  if (authProviderName() !== "cognito") redirect("/forgot");

  const { email } = await searchParams;
  if (!email) redirect("/forgot");

  return (
    <AuthShell
      title="Set a new password"
      subtitle={`We sent a six-digit code to ${email}.`}
      footer={
        <>
          Didn&apos;t get it?{" "}
          <Link href="/forgot" className="text-primary underline underline-offset-4">
            Send another
          </Link>
        </>
      }
    >
      <ResetForm email={email} />
    </AuthShell>
  );
}
