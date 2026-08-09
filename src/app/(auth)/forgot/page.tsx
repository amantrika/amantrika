import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "../AuthShell";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = {
  title: "Reset your password · Amantrika",
  robots: { index: false },
};

export default function ForgotPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you what you need to set a new one."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="text-primary underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
