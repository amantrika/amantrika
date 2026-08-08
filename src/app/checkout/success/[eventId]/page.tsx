import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Eye } from "lucide-react";
import { Button, Card, Divider, PetalRain, WaxSeal } from "@/design-system/components";
import { requireProfile } from "@/lib/auth";
import { getManagedEvent } from "@/lib/queries";
import { monogramInitials } from "@/lib/invite";
import { siteUrl } from "@/lib/env";
import { CopyLinkButton } from "./CopyLinkButton";

export const metadata: Metadata = {
  title: "Your invitation is live · Amantrika",
  robots: { index: false, follow: false },
};

/**
 * Where checkout lands.
 *
 * Payment used to return to the dashboard with `?paid=1`, which is where you go
 * to *work*, not where you go to be told it worked. This is the moment the
 * invitation becomes real, so it gets its own page — and offers exactly the two
 * things anyone wants next: see it, or carry on editing it.
 *
 * Deliberately not a celebration with no exit: both routes out are one tap.
 */
export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  await requireProfile(`/checkout/success/${eventId}`);

  // RLS scopes this to invitations the caller may manage, so a guessed id
  // returns nothing rather than someone else's invitation.
  const event = await getManagedEvent(eventId);
  if (!event) notFound();

  const inviteUrl = `${siteUrl}/invite/${event.slug}`;
  const initials = monogramInitials(event.hosts).join("·");
  const isLive = event.status === "published";

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-16 text-center">
      <PetalRain type="marigold" density={16} />

      <WaxSeal monogram={initials} size={104} />

      <h1 className="mt-8 type-display-lg text-primary">
        {isLive ? "Your invitation is live" : "Payment received"}
      </h1>

      <p className="mx-auto mt-4 max-w-md type-body-lg text-muted">
        {isLive
          ? "Share the link below and every guest — however many — opens the same invitation."
          : "Your payment went through. Publish from your dashboard whenever the details are ready."}
      </p>

      {isLive && (
        <Card variant="ornate" className="mx-auto mt-8 w-full max-w-lg p-5">
          <p className="type-overline">Your forever link</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-soft border border-ornate/50 bg-raised px-3 py-2 text-left font-mono text-sm text-primary">
              {inviteUrl}
            </code>
            <CopyLinkButton url={inviteUrl} eventId={event.id} />
          </div>
        </Card>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {isLive && (
          <Link href={`/invite/${event.slug}`} target="_blank">
            <Button size="lg" variant="celebration">
              <Eye className="size-4" /> View your invitation
            </Button>
          </Link>
        )}
        <Link href={`/dashboard/${event.id}`}>
          <Button size="lg" variant={isLive ? "secondary" : "celebration"}>
            Manage invitation <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>

      <Divider variant="motif" motif="marigold" className="mx-auto mt-12 w-full max-w-sm" />

      <p className="mx-auto mt-6 max-w-md type-caption">
        A receipt is on its way to your email. Guest replies, view counts and meal
        preferences all appear in your dashboard as they arrive.
      </p>
    </main>
  );
}
