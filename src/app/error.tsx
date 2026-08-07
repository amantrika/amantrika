"use client";

import { useEffect } from "react";
import { Button, Card, Divider } from "@/design-system/components";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in the Vercel runtime logs alongside the digest shown below.
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Card variant="ornate" className="max-w-md p-10 text-center">
        <p className="type-overline">Something went wrong</p>
        <h1 className="mt-2 type-display-lg text-primary">A knot in the thread</h1>
        <p className="mt-3 type-body text-muted">
          We hit an unexpected error. Trying again usually sorts it out.
        </p>
        {error.digest && (
          <p className="mt-4 font-mono type-caption">Reference: {error.digest}</p>
        )}
        <Divider variant="motif" motif="marigold" className="my-8" />
        <Button onClick={reset}>Try again</Button>
      </Card>
    </main>
  );
}
