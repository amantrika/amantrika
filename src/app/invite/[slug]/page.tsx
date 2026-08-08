import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InviteClient } from "./InviteClient";
import { getBlessings } from "@/lib/invites/queries";
import { getCachedInvite } from "@/lib/cache";
import { hostLine } from "@/lib/invites/invite";
import { seedBlessings } from "@/data/blessings";
import { siteUrl } from "@/lib/env";
import { entitlementsFor } from "@/lib/invites/entitlements";
import { MadeWithBadge } from "@/components/invite/MadeWithBadge";
import { eventJsonLd, graph } from "@/lib/seo/jsonld";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const invite = await getCachedInvite(slug);
  if (!invite) return { title: "Invitation not found · Amantrika" };

  const entitlements = entitlementsFor(invite.planCode);

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
    // A watermarked preview is unfinished, unpaid work. Indexing it would put
    // someone's half-made invitation into search results, and would undercut
    // the upgrade it exists to sell.
    ...(entitlements.watermarked ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title: names,
      description,
      url: `${siteUrl}/invite/${slug}`,
      // Withheld on a watermarked invitation, deliberately: sharing it to
      // WhatsApp shows no rich card. That absence is the paywall.
      images:
        entitlements.ogImage && invite.photos[0] ? [{ url: invite.photos[0].url }] : undefined,
      type: "website",
    },
  };
}

export default async function InvitePage({ params }: { params: Params }) {
  const { slug } = await params;
  const invite = await getCachedInvite(slug);
  if (!invite) notFound();

  const entitlements = entitlementsFor(invite.planCode);

  // Demo invites have no rows, so they show the bundled blessings instead.
  const blessings = invite.id
    ? (await getBlessings(invite.id)).map((b) => ({ id: b.id, name: b.name, message: b.message }))
    : seedBlessings;

  const names = hostLine(invite.hosts) || invite.title;

  return (
    <>
      <InviteClient invite={invite} blessings={blessings} />

      {entitlements.structuredData && (
        <script
          type="application/ld+json"
          // Server-rendered, from a typed builder — never a hand-written string.
          dangerouslySetInnerHTML={{
            __html: graph(
              eventJsonLd({
                name: names,
                path: `/invite/${slug}`,
                startDate: invite.mainDate,
                city: invite.city || undefined,
                image: invite.photos[0]?.url,
              })
            ),
          }}
        />
      )}

      {/* A quiet corner badge rather than a tiled watermark. Defacing a
          family's invitation would make guests resent the mark instead of
          following it — and following it is the entire point. */}
      {entitlements.watermarked && <MadeWithBadge slug={slug} />}
    </>
  );
}
