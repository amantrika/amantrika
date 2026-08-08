"use client";

import { useState, useTransition } from "react";
import { Badge, Button, Card, Table, Textarea } from "@/design-system/components";
import { AdminFeedback, AdminSection } from "../AdminShell";
import { setFeatureStatus } from "@/lib/features/actions";
import { STATUS_META, type FeatureRequest, type FeatureStatus } from "@/lib/features/types";

const STATUSES: FeatureStatus[] = ["open", "planned", "building", "shipped", "declined"];

export function RequestsTable({ requests }: { requests: FeatureRequest[] }) {
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function change(requestId: string, status: FeatureStatus, withNote?: string) {
    startTransition(async () => {
      const result = await setFeatureStatus({ requestId, status, note: withNote });
      setMessage({
        text: result.ok ? (result.notice ?? "Updated.") : (result.error ?? "Failed."),
        isError: !result.ok,
      });
      if (result.ok) { setNoteFor(null); setNote(""); }
    });
  }

  const open = requests.filter((r) => r.status === "open");

  return (
    <div>
      <AdminFeedback message={message} />

      <AdminSection
        title={`Feature requests (${requests.length})`}
        description={`${open.length} still collecting votes. Moving one off "open" closes its voting — the board then shows a settled decision rather than a live contest.`}
      >
        {requests.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="type-caption italic">Nobody has suggested anything yet.</p>
          </Card>
        ) : (
          <Table headers={["Request", "By", "Votes", "Status", "Set status"]}>
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="max-w-80 px-4 py-3">
                  <span className="font-semibold">{r.title}</span>
                  {r.body && <span className="block type-caption">{r.body}</span>}
                  {r.statusNote && (
                    <span className="mt-1 block type-caption italic">Note: {r.statusNote}</span>
                  )}
                </td>
                <td className="px-4 py-3 type-caption">{r.authorName ?? "A member"}</td>
                <td className="px-4 py-3 font-semibold">{r.votes}</td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_META[r.status].tone}>{STATUS_META[r.status].label}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.filter((s) => s !== r.status).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => (s === "declined" ? setNoteFor(r.id) : change(r.id, s))}
                      >
                        {STATUS_META[s].label}
                      </Button>
                    ))}
                  </div>

                  {noteFor === r.id && (
                    <div className="mt-3 max-w-sm">
                      {/* A refusal without a reason reads as contempt; the note is
                          shown publicly next to the request. */}
                      <Textarea
                        label="Why not?"
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        hint="Shown publicly on the roadmap."
                      />
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setNoteFor(null)}>Cancel</Button>
                        <Button size="sm" loading={pending} onClick={() => change(r.id, "declined", note || undefined)}>
                          Mark not planned
                        </Button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </AdminSection>
    </div>
  );
}
