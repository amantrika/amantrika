"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge, Button, Card, Input, Select, Table } from "@/design-system/components";
import { AdminFeedback, AdminSection } from "../AdminShell";
import { setUserRole } from "../actions";
import { roleLabels } from "@/lib/roles";
import type { UserRole } from "@/lib/supabase/types";

export interface UserRowData {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  createdAt: string;
  referredBy: string | null;
  invites: number;
  /** On the admin allowlist. Only these addresses can ever hold the admin role. */
  adminEligible: boolean;
  isSelf: boolean;
}

export function UsersTable({ rows }: { rows: UserRowData[] }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const q = search.toLowerCase();
        const matches =
          !q ||
          (r.name ?? "").toLowerCase().includes(q) ||
          (r.email ?? "").toLowerCase().includes(q);
        return matches && (roleFilter === "all" || r.role === roleFilter);
      }),
    [rows, search, roleFilter]
  );

  function changeRole(id: string, role: UserRole) {
    startTransition(async () => {
      const result = await setUserRole(id, role);
      setMessage({
        text: result.ok ? (result.notice ?? "Updated.") : (result.error ?? "Failed."),
        isError: !result.ok,
      });
    });
  }

  return (
    <div>
      <AdminFeedback message={message} />

      <AdminSection
        title={`People (${rows.length})`}
        description="Admin is restricted to allowlisted addresses — the database refuses it for anyone else, regardless of what this page allows."
      >
        <div className="mb-4 flex flex-wrap gap-3">
          <Input
            aria-label="Search people"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-56 flex-1"
          />
          <Select
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: "all", label: "All roles" },
              { value: "host", label: "Hosts" },
              { value: "agent", label: "Partners" },
              { value: "admin", label: "Admins" },
            ]}
          />
        </div>

        {filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="type-caption italic">Nobody matches that.</p>
          </Card>
        ) : (
          <Table headers={["Name", "Email", "Role", "Invites", "Joined", "Change role"]}>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-semibold">
                  {r.name ?? "—"}
                  {r.isSelf && <span className="ml-2 type-caption">(you)</span>}
                </td>
                <td className="px-4 py-3 type-caption">{r.email}</td>
                <td className="px-4 py-3">
                  <Badge
                    tone={r.role === "admin" ? "primary" : r.role === "agent" ? "accent" : "neutral"}
                  >
                    {roleLabels[r.role]}
                  </Badge>
                </td>
                <td className="px-4 py-3">{r.invites}</td>
                <td className="px-4 py-3 type-caption">
                  {new Date(r.createdAt).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  {r.isSelf ? (
                    <span className="type-caption italic">—</span>
                  ) : (
                    <div className="flex gap-1.5">
                      {(["host", "agent", "admin"] as UserRole[]).map((role) => {
                        const blocked = role === "admin" && !r.adminEligible;
                        return (
                          <Button
                            key={role}
                            size="sm"
                            variant={r.role === role ? "primary" : "ghost"}
                            disabled={r.role === role || blocked || pending}
                            title={
                              blocked
                                ? "This address isn't on the admin allowlist"
                                : `Make ${role}`
                            }
                            onClick={() => changeRole(r.id, role)}
                          >
                            {role}
                          </Button>
                        );
                      })}
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
