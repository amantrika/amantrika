"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge, Button, Card } from "@/design-system/components";
import { AdminFeedback, AdminSection } from "../AdminShell";
import { curateShowcase, removeFromShowcase } from "../actions";
import { eventTypeLabels } from "@/lib/invites/invite";
import { getTheme } from "@/themes";
import type { EventType } from "@/lib/supabase/types";

export interface CurationRow {
  id: string;
  title: string;
  slug: string;
  eventType: EventType;
  themeId: string;
  city: string | null;
  isShowcased: boolean;
  anonymise: boolean;
  consentedAt: string | null;
}

export function ShowcaseCuration({ rows }: { rows: CurationRow[] }) {
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const waiting = rows.filter((r) => !r.isShowcased);
  const live = rows.filter((r) => r.isShowcased);

  function run(fn: () => Promise<{ ok: boolean; error?: string; notice?: string }>) {
    startTransition(async () => {
      const result = await fn();
      setMessage({
        text: result.ok ? (result.notice ?? "Done.") : (result.error ?? "Failed."),
        isError: !result.ok,
      });
    });
  }

  return (
    <div>
      <AdminFeedback message={message} />

      <Card variant="ornate" className="mb-8 p-5">
        <p className="type-body">
          Publishing here creates a <strong>sanitised copy</strong> — venue addresses reduced to a
          city, phone numbers, gift and payment details removed, guests and RSVPs never copied. The
          gallery links to that copy and never to the family&apos;s live invitation.
        </p>
      </Card>

      <AdminSection
        title={`Consented, awaiting curation (${waiting.length})`}
        description="These hosts ticked the box. Nothing is public until you publish it."
      >
        {waiting.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="type-caption italic">Nothing waiting.</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {waiting.map((r) => (
              <Card key={r.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="type-h2 text-primary">{r.title}</p>
                    <p className="type-caption">
                      {eventTypeLabels[r.eventType]}
                      {r.city ? ` · ${r.city}` : ""} · {getTheme(r.themeId).name}
                    </p>
                  </div>
                  {r.anonymise && <Badge tone="accent">first names only</Badge>}
                </div>

                {r.consentedAt && (
                  <p className="mt-2 type-caption">
                    Consented {new Date(r.consentedAt).toLocaleDateString("en-IN")}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/invite/${r.slug}`} target="_blank">
                    <Button size="sm" variant="ghost">
                      Preview original
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    loading={pending}
                    onClick={() =>
                      run(() => curateShowcase(r.id, [r.eventType, r.themeId]))
                    }
                  >
                    Publish sanitised copy
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AdminSection>

      <AdminSection title={`Live in the gallery (${live.length})`}>
        {live.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="type-caption italic">The gallery is empty.</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {live.map((r) => (
              <Card key={r.id} variant="ornate" className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="type-h2 text-primary">{r.title}</p>
                    <p className="type-caption">
                      {eventTypeLabels[r.eventType]} · {getTheme(r.themeId).name}
                    </p>
                  </div>
                  <Badge tone="success">live</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/showcase" target="_blank">
                    <Button size="sm" variant="ghost">
                      Open gallery
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={pending}
                    onClick={() => run(() => removeFromShowcase(r.id))}
                  >
                    Withdraw
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AdminSection>
    </div>
  );
}
