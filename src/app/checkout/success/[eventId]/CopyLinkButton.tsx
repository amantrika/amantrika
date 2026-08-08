"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/design-system/components";
import { capture } from "@/lib/posthog/client";
import { EVENTS } from "@/lib/posthog/events";

/** The one interactive part of an otherwise server-rendered success page. */
export function CopyLinkButton({ url, eventId }: { url: string; eventId: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        navigator.clipboard?.writeText(url);
        setCopied(true);
        capture(EVENTS.invite_link_copied, { event_id: eventId, surface: "checkout_success" });
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      <Copy className="size-4" /> {copied ? "Copied!" : "Copy"}
    </Button>
  );
}
