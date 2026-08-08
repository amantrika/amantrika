"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/design-system/components";
import { simulatePayment } from "./actions";

export function MockCheckoutForm({
  orderId,
  eventId,
}: {
  orderId: string;
  eventId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"succeeded" | "failed" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function simulate(outcome: "succeeded" | "failed") {
    setPending(outcome);
    setError(null);

    const result = await simulatePayment({ orderId, outcome });

    if (!result.ok) {
      setPending(null);
      setError(result.error ?? "The webhook refused that delivery.");
      return;
    }

    // The webhook, not this page, decided what happened. Land on the dashboard
    // and let it read the order row.
    router.push(`/dashboard/${eventId}?paid=1`);
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <Button
        size="lg"
        variant="celebration"
        className="w-full"
        loading={pending === "succeeded"}
        disabled={pending !== null}
        onClick={() => simulate("succeeded")}
      >
        Simulate success
      </Button>
      <Button
        variant="ghost"
        className="w-full"
        loading={pending === "failed"}
        disabled={pending !== null}
        onClick={() => simulate("failed")}
      >
        Simulate failure
      </Button>

      {error && (
        <p role="alert" className="text-center type-caption text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
