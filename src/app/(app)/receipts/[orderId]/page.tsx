import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = {
  title: "Receipt · Amantrika",
  robots: { index: false, follow: false },
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/**
 * A payment receipt the customer can keep.
 *
 * Deliberately a *page* rather than a generated PDF. A print-styled page is
 * downloadable as PDF from every browser and phone via "Save as PDF", needs no
 * rendering dependency on the server, and stays readable if the styles fail —
 * which a PDF does not. It is also a durable URL the buyer can return to.
 *
 * Access is via RLS: `orders` is readable only by its buyer, the attributed
 * agent, or an admin. A guessed id returns nothing rather than someone else's
 * payment.
 */
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  await requireProfile(`/receipts/${orderId}`);

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();

  const [{ data: plan }, { data: event }, { data: buyer }] = await Promise.all([
    supabase.from("plans").select("name, description").eq("code", order.plan_code).maybeSingle(),
    supabase.from("events").select("title, slug").eq("id", order.event_id).maybeSingle(),
    supabase.from("profiles").select("full_name, email").eq("id", order.buyer_id).maybeSingle(),
  ]);

  const paid = order.status === "paid";
  const when = order.paid_at ?? order.created_at;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 print:py-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard" className="type-caption text-primary hover:underline">
          ← Back to dashboard
        </Link>
        <PrintButton />
      </div>

      <article className="rounded-card border border-ornate/40 bg-surface p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ornate/30 pb-6">
          <div>
            <p className="font-display text-3xl font-semibold text-primary">Amantrika</p>
            <p className="mt-1 type-caption">Digital invitations for every celebration</p>
          </div>
          <div className="text-right">
            <p className="type-overline">Receipt</p>
            {/* The provider's reference, not our uuid — this is the number that
                matches their bank statement and any support conversation. */}
            <p className="mt-1 font-mono text-sm text-foreground">
              {order.provider_ref ?? order.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="mt-1 type-caption">
              {new Date(when).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-ornate/30 py-6 sm:grid-cols-2">
          <div>
            <p className="type-overline">Billed to</p>
            <p className="mt-1 type-body font-semibold">{buyer?.full_name ?? "—"}</p>
            <p className="type-caption">{buyer?.email}</p>
          </div>
          <div className="sm:text-right">
            <p className="type-overline">Status</p>
            <p className={`mt-1 type-body font-semibold ${paid ? "text-success" : "text-muted"}`}>
              {paid ? "Paid" : order.status}
            </p>
            {order.provider !== "dummy" && (
              <p className="type-caption">via {order.provider}</p>
            )}
          </div>
        </section>

        <table className="w-full py-6 text-left">
          <thead>
            <tr className="border-b border-ornate/30">
              <th className="py-3 type-overline">Item</th>
              <th className="py-3 text-right type-overline">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-4">
                <span className="type-body font-semibold">{plan?.name ?? order.plan_code}</span>
                {event?.title && (
                  <span className="block type-caption">
                    For “{event.title}” · /invite/{event.slug}
                  </span>
                )}
                {plan?.description && (
                  <span className="block type-caption">{plan.description}</span>
                )}
              </td>
              <td className="py-4 text-right type-body">{inr(order.amount_inr)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t border-ornate/40">
              <td className="py-4 type-body font-semibold">Total paid</td>
              <td className="py-4 text-right font-display text-2xl font-semibold text-primary">
                {inr(order.amount_inr)}
              </td>
            </tr>
          </tfoot>
        </table>

        <footer className="border-t border-ornate/30 pt-6">
          <p className="type-caption">
            Thank you. Your invitation lives at{" "}
            <span className="font-mono">{siteUrl}/invite/{event?.slug}</span> and stays there.
          </p>
          <p className="mt-2 type-caption">
            Questions about this payment? Reply to the confirmation email and quote the receipt
            number above.
          </p>
        </footer>
      </article>
    </div>
  );
}
