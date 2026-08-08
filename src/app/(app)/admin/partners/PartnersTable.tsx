"use client";

import { useState, useTransition } from "react";
import { Badge, Button, Card, Input, Modal, Table, Textarea } from "@/design-system/components";
import { AdminFeedback, AdminSection } from "../AdminShell";
import { reviewPartner } from "../actions";
import type { AgentStatus } from "@/lib/supabase/types";

export interface PartnerRow {
  id: string;
  name: string | null;
  email: string | null;
  agencyName: string | null;
  referralCode: string;
  commissionRate: number;
  status: AgentStatus;
  appliedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  applicationNote: string | null;
  invitesManaged: number;
  earnedInr: number;
}

const tone: Record<AgentStatus, "success" | "accent" | "error" | "neutral"> = {
  approved: "success",
  pending: "accent",
  rejected: "error",
  suspended: "neutral",
};

export function PartnersTable({ rows }: { rows: PartnerRow[] }) {
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [reviewing, setReviewing] = useState<PartnerRow | null>(null);
  const [note, setNote] = useState("");
  const [rate, setRate] = useState("15");
  const [pending, startTransition] = useTransition();

  const queue = rows.filter((r) => r.status === "pending");
  const decided = rows.filter((r) => r.status !== "pending");

  function act(agentId: string, status: AgentStatus, extra?: { note?: string; rate?: number }) {
    startTransition(async () => {
      const result = await reviewPartner({
        agentId,
        status,
        note: extra?.note,
        commissionRate: extra?.rate,
      });
      setMessage({
        text: result.ok ? (result.notice ?? "Done.") : (result.error ?? "Something went wrong."),
        isError: !result.ok,
      });
      if (result.ok) setReviewing(null);
    });
  }

  return (
    <div>
      <AdminFeedback message={message} />

      <AdminSection
        title={`Applications awaiting review (${queue.length})`}
        description="A partner cannot manage any invitation until approved."
      >
        {queue.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="type-caption italic">Nothing waiting. Everything is reviewed.</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {queue.map((r) => (
              <Card key={r.id} variant="ornate" className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="type-h2 text-primary">{r.agencyName || r.name || "Unnamed"}</p>
                    <p className="type-caption">{r.email}</p>
                  </div>
                  <Badge tone={tone[r.status]}>{r.status}</Badge>
                </div>

                {r.applicationNote && (
                  <p className="mt-3 rounded-soft border border-ornate/30 bg-raised p-3 type-caption">
                    {r.applicationNote}
                  </p>
                )}

                <p className="mt-3 type-caption">
                  Applied {new Date(r.appliedAt).toLocaleDateString("en-IN")} · code{" "}
                  <span className="font-mono">{r.referralCode}</span>
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    loading={pending}
                    onClick={() => {
                      setReviewing(r);
                      setRate(String(Math.round(r.commissionRate * 100)));
                      setNote("");
                    }}
                  >
                    Approve…
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={pending}
                    onClick={() => act(r.id, "rejected")}
                  >
                    Reject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AdminSection>

      <AdminSection title="All partners">
        {decided.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="type-caption italic">No partners yet.</p>
          </Card>
        ) : (
          <Table headers={["Partner", "Email", "Code", "Rate", "Invites", "Earned", "Status", ""]}>
            {decided.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-semibold">{r.agencyName || r.name || "—"}</td>
                <td className="px-4 py-3 type-caption">{r.email}</td>
                <td className="px-4 py-3 font-mono type-caption">{r.referralCode}</td>
                <td className="px-4 py-3">{(r.commissionRate * 100).toFixed(0)}%</td>
                <td className="px-4 py-3">{r.invitesManaged}</td>
                <td className="px-4 py-3">₹{r.earnedInr.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3">
                  <Badge tone={tone[r.status]}>{r.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  {r.status === "approved" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={pending}
                      onClick={() => act(r.id, "suspended")}
                    >
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={pending}
                      onClick={() => act(r.id, "approved")}
                    >
                      Reinstate
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </AdminSection>

      <Modal
        open={Boolean(reviewing)}
        onClose={() => setReviewing(null)}
        title={`Approve ${reviewing?.agencyName || reviewing?.name || "partner"}`}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Commission rate (%)"
            type="number"
            min={0}
            max={100}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            hint="Applied to every plan they sell from now on."
          />
          <Textarea
            label="Internal note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            hint="Only visible to admins."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReviewing(null)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={() =>
                reviewing &&
                act(reviewing.id, "approved", {
                  note: note || undefined,
                  rate: Number(rate) / 100,
                })
              }
            >
              Approve partner
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
