"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Badge, Button, Card, Input, Select, Table } from "@/design-system/components";
import { AdminFeedback, AdminSection } from "../AdminShell";
import { setInvitationStatus } from "../actions";
import { eventTypeLabels } from "@/lib/invite";
import type { EventStatus, EventType } from "@/lib/supabase/types";

export interface InvitationRow {
  id: string;
  slug: string;
  title: string;
  eventType: EventType;
  status: EventStatus;
  themeId: string;
  city: string | null;
  mainDate: string | null;
  createdAt: string;
  publishedAt: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  viaAgent: boolean;
  consented: boolean;
  isShowcased: boolean;
}

const statusTone: Record<EventStatus, "success" | "accent" | "neutral"> = {
  published: "success",
  draft: "accent",
  archived: "neutral",
};

export function InvitationsTable({ rows }: { rows: InvitationRow[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const q = search.toLowerCase();
        const matches =
          !q ||
          r.title.toLowerCase().includes(q) ||
          r.slug.includes(q) ||
          (r.ownerEmail ?? "").toLowerCase().includes(q);
        return matches && (status === "all" || r.status === status);
      }),
    [rows, search, status]
  );

  function moderate(id: string, next: EventStatus) {
    startTransition(async () => {
      const result = await setInvitationStatus(id, next);
      setMessage({
        text: result.ok ? (result.notice ?? "Updated.") : (result.error ?? "Failed."),
        isError: !result.ok,
      });
    });
  }

  const drafts = rows.filter((r) => r.status === "draft").length;

  return (
    <div>
      <AdminFeedback message={message} />

      <AdminSection
        title={`Invitations (${rows.length})`}
        description={`${drafts} still in progress. Taking one offline hides it from guests immediately.`}
      >
        <div className="mb-4 flex flex-wrap gap-3">
          <Input
            aria-label="Search invitations"
            placeholder="Search by title, link or owner email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-56 flex-1"
          />
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: "all", label: "All statuses" },
              { value: "published", label: "Published" },
              { value: "draft", label: "In progress" },
              { value: "archived", label: "Archived" },
            ]}
          />
        </div>

        {filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="type-caption italic">Nothing matches that.</p>
          </Card>
        ) : (
          <Table
            headers={["Invitation", "Occasion", "Owner", "Status", "Created", "Showcase", ""]}
          >
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <span className="font-semibold">{r.title}</span>
                  <span className="block font-mono type-caption">/invite/{r.slug}</span>
                </td>
                <td className="px-4 py-3">{eventTypeLabels[r.eventType]}</td>
                <td className="px-4 py-3 type-caption">
                  {r.ownerName ?? "—"}
                  {r.viaAgent && <Badge tone="accent" className="ml-2">agent</Badge>}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                </td>
                <td className="px-4 py-3 type-caption">
                  {new Date(r.createdAt).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3 type-caption">
                  {r.isShowcased ? "live" : r.consented ? "eligible" : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {r.status === "published" ? (
                      <>
                        <Link href={`/invite/${r.slug}`} target="_blank">
                          <Button size="sm" variant="ghost">View</Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => moderate(r.id, "draft")}
                        >
                          Unpublish
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => moderate(r.id, "published")}
                      >
                        Publish
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </AdminSection>
    </div>
  );
}
