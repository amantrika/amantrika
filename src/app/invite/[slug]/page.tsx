import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InviteClient } from "./InviteClient";
import { getBlessings, getPublishedInvite } from "@/lib/queries";
import { hostLine } from "@/lib/invite";
import { seedBlessings } from "@/data/blessings";
import { siteUrl } from "@/lib/env";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const invite = await getPublishedInvite(slug);
  if (!invite) return { title: "Invitation not found · Amantrika" };

  const names = hostLine(invite.hosts) || invite.title;
  const date = invite.mainDate
    ? new Date(invite.mainDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const description = [date, invite.city].filter(Boolean).join(" · ") || "You're invited.";

  return {
    title: `${names} · Amantrika`,
    description,
    openGraph: {
      title: names,
      description,
      url: `${siteUrl}/invite/${slug}`,
      images: invite.photos[0] ? [{ url: invite.photos[0].url }] : undefined,
      type: "website",
    },
  };
}

export default async function InvitePage({ params }: { params: Params }) {
  const { slug } = await params;
  const invite = await getPublishedInvite(slug);
  if (!invite) notFound();

  // Demo invites have no rows, so they show the bundled blessings instead.
  const blessings = invite.id
    ? (await getBlessings(invite.id)).map((b) => ({ id: b.id, name: b.name, message: b.message }))
    : seedBlessings;

  return <InviteClient invite={invite} blessings={blessings} />;
}
