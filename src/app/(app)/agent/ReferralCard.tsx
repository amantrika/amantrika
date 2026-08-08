"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Button, Card } from "@/design-system/components";
import { capture } from "@/lib/posthog/client";
import { EVENTS } from "@/lib/posthog/events";

/** Referral link an agent shares so signups are credited to them. */
export function ReferralCard({
  referralCode,
  commissionRate,
  signupUrl,
}: {
  referralCode: string;
  commissionRate: number;
  signupUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Card variant="ornate" className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="type-overline">Your referral code</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-primary">{referralCode}</p>
        </div>
        <div className="text-right">
          <p className="type-overline">Commission</p>
          <p className="mt-1 font-display text-2xl font-semibold text-primary">
            {(commissionRate * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <code className="min-w-0 flex-1 truncate rounded-soft border border-ornate/50 bg-raised px-3 py-2 font-mono text-sm text-primary">
          {signupUrl}
        </code>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            navigator.clipboard?.writeText(signupUrl);
            setCopied(true);
            capture(EVENTS.agent_referral_copied, { commission_rate: commissionRate });
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          <Copy className="size-4" /> {copied ? "Copied!" : "Copy link"}
        </Button>
      </div>
    </Card>
  );
}
