import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Eye } from "lucide-react";
import { DashboardShell, NewInviteButton } from "../DashboardShell";
import { requireProfile } from "@/lib/auth";
import { listManagedEvents } from "@/lib/invites/queries";
import { eventTypeLabels } from "@/lib/invites/invite";
import { Badge, Button, Card } from "@/design-system/components";

export const metadata: Metadata = {
  title: "Your celebrations · Amantrika",
  robots: { index: false },
};

const statusTone = {
  published: "success",
  draft: "accent",
  archived: "neutral",
} as const;

export default async function DashboardPage() {
  const profile = await requireProfile("/dashboard");
  const events = await listManagedEvents();

  return (
    <DashboardShell
      profile={profile}
      title={profile.role === "host" ? "Your celebrations" : "Celebrations you manage"}
      subtitle={
        events.length === 0
          ? "Nothing here yet — your first invitation takes about ten minutes."
          : `${events.length} invitation${events.length === 1 ? "" : "s"}.`
      }
      action={<NewInviteButton />}
    >
      {events.length === 0 ? (
        <Card variant="ornate" className="p-12 text-center">
          <CalendarDays className="mx-auto size-10 text-accent" />
          <h2 className="mt-4 type-h1 text-primary">Start your first invitation</h2>
          <p className="mx-auto mt-2 max-w-md type-body text-muted">
            Choose an occasion, pick a theme, add your details and photos — then share one link
            with everyone you love.
          </p>
          <Link href="/onboarding" className="mt-6 inline-block">
            <Button size="lg" variant="celebration">
              Create your invitation
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {events.map((event) => (
            <Card
              key={event.id}
              variant="ornate"
              className="flex flex-col p-6 transition-shadow hover:shadow-lifted"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="type-overline">{eventTypeLabels[event.event_type]}</p>
                  <h2 className="mt-1 type-h2 text-primary">{event.title}</h2>
                </div>
                <Badge tone={statusTone[event.status]}>{event.status}</Badge>
              </div>

              {/* Date, place and link are the three facts you scan a list of
                  celebrations for, so they get their own ruled block rather
                  than trailing off under the title. */}
              <hr aria-hidden className="dhaga-rule mt-4" />
              <dl className="mt-4 space-y-1.5 type-caption">
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 text-muted">When</dt>
                  <dd className="text-foreground">
                    {event.main_datetime
                      ? new Date(event.main_datetime).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "Date not set"}
                  </dd>
                </div>
                {event.city && (
                  <div className="flex gap-2">
                    <dt className="w-14 shrink-0 text-muted">Where</dt>
                    <dd className="text-foreground">{event.city}</dd>
                  </div>
                )}
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 text-muted">Link</dt>
                  <dd className="min-w-0 truncate font-mono text-foreground">
                    /invite/{event.slug}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link href={`/dashboard/${event.id}`}>
                  <Button size="sm">
                    Manage <ArrowRight className="size-4" />
                  </Button>
                </Link>
                {event.status === "published" && (
                  <Link href={`/invite/${event.slug}`} target="_blank">
                    <Button size="sm" variant="secondary">
                      <Eye className="size-4" /> View live
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
