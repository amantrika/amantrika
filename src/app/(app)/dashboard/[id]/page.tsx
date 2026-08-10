import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { DashboardShell } from "../../DashboardShell";
import { EventWorkspace } from "./EventWorkspace";
import { requireProfile } from "@/lib/auth";
import {
  getAssets,
  getEventStats,
  getGuests,
  getManagedEvent,
  getRsvps,
  getSubEvents,
  getViewsByDay,
  getModeratableBlessings,
} from "@/lib/invites/queries";
import { createClient } from "@/lib/supabase/server";
import { eventTypeLabels } from "@/lib/invites/invite";
import { siteUrl } from "@/lib/env";
import { Button } from "@/design-system/components";
import type { BlessingRow } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Manage invitation · Amantrika",
  robots: { index: false },
};

export default async function EventDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile(`/dashboard/${id}`);

  const event = await getManagedEvent(id, profile.id);
  if (!event) notFound();

  const supabase = await createClient();

  const [stats, viewsByDay, guests, rsvps, subEvents, assets, blessingsResult] = await Promise.all([
    getEventStats(event.id, profile.id),
    getViewsByDay(event.id, 14, profile.id),
    getGuests(event.id),
    getRsvps(event.id, profile.id),
    getSubEvents(event.id),
    getAssets(event.id, profile.id),
    getModeratableBlessings(event.id, profile.id),
  ]);

  return (
    <DashboardShell
      profile={profile}
      title={event.title}
      subtitle={`${eventTypeLabels[event.event_type]} · /invite/${event.slug}`}
      action={
        event.status === "published" ? (
          <Link href={`/invite/${event.slug}`} target="_blank">
            <Button variant="secondary">
              <Eye className="size-4" /> View live invite
            </Button>
          </Link>
        ) : null
      }
    >
      <EventWorkspace
        event={event}
        stats={stats}
        viewsByDay={viewsByDay}
        guests={guests}
        rsvps={rsvps}
        subEvents={subEvents}
        assets={assets}
        blessings={(blessingsResult) as BlessingRow[]}
        origin={siteUrl}
      />
    </DashboardShell>
  );
}
