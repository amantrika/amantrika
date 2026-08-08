"use client";

import { useState, useTransition } from "react";
import { Badge, Button, Card, Input, Switch, Textarea } from "@/design-system/components";
import { AdminFeedback, AdminSection } from "../AdminShell";
import { upsertPlan } from "../actions";

export interface PlanEditRow {
  code: string;
  name: string;
  priceInr: number;
  description: string | null;
  features: string[];
  isActive: boolean;
  soldCount: number;
  revenueInr: number;
}

export function PlansEditor({ rows }: { rows: PlanEditRow[] }) {
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, PlanEditRow>>(
    Object.fromEntries(rows.map((r) => [r.code, r]))
  );
  const [pending, startTransition] = useTransition();

  function patch(code: string, p: Partial<PlanEditRow>) {
    setDrafts((d) => ({ ...d, [code]: { ...d[code], ...p } }));
  }

  function save(code: string) {
    const plan = drafts[code];
    startTransition(async () => {
      const result = await upsertPlan({
        code: plan.code,
        name: plan.name,
        priceInr: plan.priceInr,
        description: plan.description ?? undefined,
        isActive: plan.isActive,
      });
      setMessage({
        text: result.ok ? (result.notice ?? "Saved.") : (result.error ?? "Failed."),
        isError: !result.ok,
      });
    });
  }

  return (
    <div>
      <AdminFeedback message={message} />

      <AdminSection
        title="Plans"
        description="Changes appear on the landing page and in checkout immediately. Payments are still in demo mode, so nothing is charged."
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {rows.map((r) => {
            const d = drafts[r.code];
            return (
              <Card key={r.code} variant="ornate" className="flex flex-col p-6">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono type-caption">{r.code}</span>
                  <Badge tone={d.isActive ? "success" : "neutral"}>
                    {d.isActive ? "live" : "hidden"}
                  </Badge>
                </div>

                <div className="mt-4 flex flex-col gap-4">
                  <Input
                    label="Name"
                    value={d.name}
                    onChange={(e) => patch(r.code, { name: e.target.value })}
                  />
                  <Input
                    label="Price (₹)"
                    type="number"
                    min={0}
                    value={String(d.priceInr)}
                    onChange={(e) => patch(r.code, { priceInr: Number(e.target.value) })}
                  />
                  <Textarea
                    label="Description"
                    rows={2}
                    value={d.description ?? ""}
                    onChange={(e) => patch(r.code, { description: e.target.value })}
                  />
                  <Switch
                    label="Visible to customers"
                    checked={d.isActive}
                    onChange={(v) => patch(r.code, { isActive: v })}
                  />
                </div>

                <p className="mt-4 type-caption">
                  {r.soldCount} sold · ₹{r.revenueInr.toLocaleString("en-IN")} revenue
                </p>

                <Button
                  className="mt-4"
                  loading={pending}
                  onClick={() => save(r.code)}
                  disabled={
                    d.name === r.name &&
                    d.priceInr === r.priceInr &&
                    d.description === r.description &&
                    d.isActive === r.isActive
                  }
                >
                  Save changes
                </Button>
              </Card>
            );
          })}
        </div>
      </AdminSection>
    </div>
  );
}
