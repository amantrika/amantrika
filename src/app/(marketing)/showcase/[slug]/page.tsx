import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getShowcaseInvite } from "@/lib/invites/showcase";
import { eventTypeLabels } from "@/lib/invites/invite";
import { InviteClient } from "@/app/invite/[slug]/InviteClient";

type Params = Promise<{ slug: string }>;

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const invite = await getShowcaseInvite(slug);
  if (!invite) return { title: "Not found · Amantrika" };

  return {
    title: `${invite.title} · Showcase · Amantrika`,
    description: `A ${eventTypeLabels[invite.eventType].toLowerCase()} invitation made with Amantrika, shared with permission.`,
    openGraph: {
      title: invite.title,
      images: invite.photos[0] ? [{ url: invite.photos[0].url }] : undefined,
    },
  };
}

/**
 * A showcase clone, rendered with exactly the components a real invitation uses —
 * the whole point is to show what the product produces. RSVP and the blessings
 * wall are switched off on the clone itself (see `generate_showcase_clone`), so
 * a sample can never collect anyone's data.
 */
export default async function ShowcaseInvitePage({ params }: { params: Params }) {
  const { slug } = await params;
  const invite = await getShowcaseInvite(slug);
  if (!invite) notFound();

  return (
    <div>
      <div className="border-b border-ornate/30 bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/showcase"
            className="inline-flex items-center gap-1.5 type-caption font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="size-4" /> All showcase invitations
          </Link>
          <p className="inline-flex items-center gap-1.5 type-caption">
            <ShieldCheck className="size-4 text-success" />
            A privacy-safe sample — shared with permission, personal details removed
          </p>
        </div>
      </div>

      {/* No blessings passed: a sample has no guestbook to display. */}
      <InviteClient invite={invite} blessings={[]} />
    </div>
  );
}
