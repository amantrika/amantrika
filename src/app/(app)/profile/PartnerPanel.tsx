"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge, Button, Card, Input, Textarea } from "@/design-system/components";
import { applyToBePartner } from "./actions";
import type { AgentStatus, UserRole } from "@/lib/supabase/types";

export interface PartnerState {
  status: AgentStatus;
  agency_name: string | null;
  referral_code: string;
  commission_rate: number;
  review_note: string | null;
  applied_at: string;
}

/**
 * The partner upsell, and the state of an application once made.
 *
 * The economics are stated plainly rather than teased. A partner buys at a
 * discount and sells at the normal price, so the margin is real but finite —
 * anyone deciding whether to do this deserves the actual number, not "earn
 * money with Amantrika". Overselling it produces partners who quit.
 */
export function PartnerPanel({
  role,
  partner,
  anchorPlanName,
  anchorPriceInr,
}: {
  role: UserRole;
  partner: PartnerState | null;
  anchorPlanName: string | null;
  anchorPriceInr: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  /* Already a partner — send them to the tools instead of selling again. */
  if (role === "agent" && partner?.status === "approved") {
    return (
      <Card variant="ornate" className="h-fit p-6">
        <Badge tone="success">Partner</Badge>
        <h2 className="mt-3 type-h2 text-primary">{partner.agency_name || "Your partner account"}</h2>
        <p className="mt-2 type-caption">
          Referral code <span className="font-mono font-semibold">{partner.referral_code}</span> ·{" "}
          {(partner.commission_rate * 100).toFixed(0)}% commission
        </p>
        <Link href="/agent" className="mt-5 inline-block">
          <Button size="sm">Open partner dashboard</Button>
        </Link>
      </Card>
    );
  }

  /* Applied, awaiting a human. */
  if (partner && partner.status === "pending") {
    return (
      <Card variant="ornate" className="h-fit p-6">
        <Badge tone="accent">Application received</Badge>
        <h2 className="mt-3 type-h2 text-primary">We&apos;re reading it</h2>
        <p className="mt-2 type-body text-muted">
          Applications are reviewed by hand, so this takes a little while rather than a moment.
          You&apos;ll hear from us by email.
        </p>
        <p className="mt-3 type-caption">
          Applied {new Date(partner.applied_at).toLocaleDateString("en-IN")}
        </p>
      </Card>
    );
  }

  /* Declined — say so, with the reason, and allow another go. */
  if (partner && (partner.status === "rejected" || partner.status === "suspended")) {
    return (
      <Card className="h-fit p-6">
        <Badge tone="error">{partner.status === "rejected" ? "Not accepted" : "Paused"}</Badge>
        <h2 className="mt-3 type-h2 text-primary">
          {partner.status === "rejected" ? "We didn't take this one forward" : "Your partner account is paused"}
        </h2>
        {partner.review_note && (
          <p className="mt-3 rounded-soft border-l-2 border-ornate/60 bg-raised px-3 py-2 type-caption">
            {partner.review_note}
          </p>
        )}
        {partner.status === "rejected" && (
          <>
            <p className="mt-3 type-body text-muted">
              If something has changed, you&apos;re welcome to apply again.
            </p>
            <Button size="sm" className="mt-4" onClick={() => setOpen(true)}>
              Apply again
            </Button>
          </>
        )}
        {open && (
          <ApplicationForm
            agencyName={agencyName}
            note={note}
            setAgencyName={setAgencyName}
            setNote={setNote}
            pending={pending}
            onCancel={() => setOpen(false)}
            onSubmit={() =>
              startTransition(async () => {
                const result = await applyToBePartner({ agencyName, note });
                setMessage({
                  text: result.ok ? (result.notice ?? "Sent.") : (result.error ?? "Failed."),
                  isError: !result.ok,
                });
                if (result.ok) setOpen(false);
              })
            }
          />
        )}
        {message && <p className="mt-3 type-caption">{message.text}</p>}
      </Card>
    );
  }

  /* Never applied — the pitch. */
  const margin =
    anchorPriceInr !== null ? Math.round(anchorPriceInr * 0.2) : null;

  return (
    <Card variant="ornate" className="h-fit p-6">
      <p className="type-overline">Partner programme</p>
      <h2 className="mt-2 type-h2 text-primary">Make invitations for other people</h2>

      <p className="mt-3 type-body text-muted">
        Planners, printers and photographers already sit with couples while they choose. If that&apos;s
        you, build their invitation here: you pay a partner rate, charge your client the normal
        price, and keep the difference.
      </p>

      {anchorPriceInr !== null && margin !== null && (
        <div className="mt-4 rounded-card border border-ornate/40 bg-raised p-4">
          <p className="type-caption">
            On the {anchorPlanName} plan at ₹{anchorPriceInr.toLocaleString("en-IN")}, a partner
            keeps roughly <strong>₹{margin.toLocaleString("en-IN")}</strong> per invitation. Ten
            weddings a season is about{" "}
            <strong>₹{(margin * 10).toLocaleString("en-IN")}</strong>.
          </p>
          <p className="mt-2 type-caption">
            Your exact rate is set when we approve you, and depends on volume.
          </p>
        </div>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {[
          "One dashboard for every client's invitation",
          "Your own referral code, so signups are credited to you",
          "A commission ledger that updates the moment a client pays",
        ].map((line) => (
          <li key={line} className="type-caption">
            · {line}
          </li>
        ))}
      </ul>

      {!open ? (
        <Button variant="celebration" className="mt-5 w-full" onClick={() => setOpen(true)}>
          Apply to become a partner
        </Button>
      ) : (
        <ApplicationForm
          agencyName={agencyName}
          note={note}
          setAgencyName={setAgencyName}
          setNote={setNote}
          pending={pending}
          onCancel={() => setOpen(false)}
          onSubmit={() =>
            startTransition(async () => {
              const result = await applyToBePartner({ agencyName, note });
              setMessage({
                text: result.ok ? (result.notice ?? "Sent.") : (result.error ?? "Failed."),
                isError: !result.ok,
              });
              if (result.ok) setOpen(false);
            })
          }
        />
      )}

      {message && (
        <p
          role={message.isError ? "alert" : "status"}
          className={`mt-3 type-caption ${message.isError ? "text-red-600 dark:text-red-400" : "text-success"}`}
        >
          {message.text}
        </p>
      )}

      <p className="mt-4 type-caption">
        Applications are reviewed by hand — a partner can manage other people&apos;s invitations, so
        we don&apos;t approve those automatically.
      </p>
    </Card>
  );
}

function ApplicationForm({
  agencyName,
  note,
  setAgencyName,
  setNote,
  pending,
  onCancel,
  onSubmit,
}: {
  agencyName: string;
  note: string;
  setAgencyName: (v: string) => void;
  setNote: (v: string) => void;
  pending: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="mt-5 flex flex-col gap-4">
      <Input
        label="Business name"
        value={agencyName}
        onChange={(e) => setAgencyName(e.target.value)}
        placeholder="Kapoor Wedding Studio"
        hint="Optional — leave blank if you work under your own name."
      />
      <Textarea
        label="What do you do?"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        hint="How many weddings a year, what city, anything we should see."
      />
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" loading={pending} loadingLabel="Sending your application" onClick={onSubmit}>
          Send application
        </Button>
      </div>
    </div>
  );
}
