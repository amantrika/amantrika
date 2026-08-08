"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, Card } from "@/design-system/components";

/**
 * Error boundary for the admin area.
 *
 * Without this, a failure in any admin page falls through to the root boundary,
 * which says "something went wrong" and nothing else — indistinguishable from a
 * 404 to the person looking at it. That ambiguity cost a diagnosis round trip.
 *
 * This one names the area, shows the digest that appears in the Vercel logs, and
 * offers a retry that does not require leaving the page. Admin is a small,
 * trusted audience, so showing the error message itself is a help rather than a
 * disclosure risk.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin area error:", error);
  }, [error]);

  return (
    <Card variant="ornate" className="mx-auto max-w-xl p-10 text-center">
      <p className="type-overline">Admin</p>
      <h1 className="mt-2 type-h1 text-primary">This page didn&apos;t load</h1>
      <p className="mt-3 type-body text-muted">
        Something failed while fetching platform data. This is an error, not a missing page —
        your access is fine.
      </p>

      {error.message && (
        <pre className="mt-4 overflow-x-auto rounded-soft border border-ornate/40 bg-raised px-3 py-2 text-left font-mono text-xs text-foreground">
          {error.message}
        </pre>
      )}

      {error.digest && (
        <p className="mt-3 font-mono type-caption">
          Reference {error.digest} — search this in the Vercel logs.
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/dashboard">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </div>
    </Card>
  );
}
