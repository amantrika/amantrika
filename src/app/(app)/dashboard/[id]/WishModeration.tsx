"use client";

import { useState, useTransition } from "react";
import { Badge, Button, Card } from "@/design-system/components";
import { setWishApproved } from "./wish-actions";

export interface ModeratableWish {
  id: string;
  name: string;
  message: string;
  isApproved: boolean;
  createdAt: string;
}

/**
 * The blessing wall's moderation queue.
 *
 * Pending messages come first — they are the only ones needing a decision, and
 * a host opening this screen wants the work, not the archive. Approved ones stay
 * listed so a wish can be taken down again after it is live, which matters when
 * a family disagreement arrives in writing.
 */
export function WishModeration({
  eventId,
  wishes,
}: {
  eventId: string;
  wishes: ModeratableWish[];
}) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (wishes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="type-body text-muted">
          No messages yet. They appear here for your approval before anyone sees them.
        </p>
      </Card>
    );
  }

  const ordered = [...wishes].sort((a, b) => {
    if (a.isApproved !== b.isApproved) return a.isApproved ? 1 : -1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  function update(wishId: string, approved: boolean) {
    setBusyId(wishId);
    setError(null);
    startTransition(async () => {
      const result = await setWishApproved({ eventId, wishId, approved });
      if (!result.ok) setError(result.error ?? "That didn't work.");
      setBusyId(null);
    });
  }

  const waiting = ordered.filter((w) => !w.isApproved).length;

  return (
    <div className="space-y-4">
      {waiting > 0 && (
        <p className="type-body text-muted">
          {waiting} message{waiting === 1 ? "" : "s"} waiting for you. Nothing is visible on
          your invitation until you approve it.
        </p>
      )}
      {error && <p className="type-body text-danger">{error}</p>}

      {ordered.map((wish) => (
        <Card key={wish.id} className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="type-h3 text-primary">{wish.name || "A guest"}</p>
              <p className="mt-1 type-body whitespace-pre-wrap break-words">{wish.message}</p>
            </div>
            <Badge tone={wish.isApproved ? "success" : "accent"}>
              {wish.isApproved ? "live" : "pending"}
            </Badge>
          </div>
          <div className="mt-4 flex gap-2">
            {wish.isApproved ? (
              <Button
                size="sm"
                variant="secondary"
                loading={pending && busyId === wish.id}
                onClick={() => update(wish.id, false)}
              >
                Hide
              </Button>
            ) : (
              <Button
                size="sm"
                loading={pending && busyId === wish.id}
                onClick={() => update(wish.id, true)}
              >
                Approve
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
