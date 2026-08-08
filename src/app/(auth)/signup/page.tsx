import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "../AuthShell";
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
  searchParams: Promise<{ ref?: string; as?: string }>;
}) {
  const profile = await getProfile();
  if (profile) redirect(homeFor(profile.role));

  const { ref, as } = await searchParams;

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
      <GoogleButton label="Sign up with Google" />
      <AuthDivider />
      <SignUpForm
        referralCode={ref ?? ""}
        initialRole={as === "agent" ? "agent" : "host"}
      />
    </AuthShell>
  );
}
