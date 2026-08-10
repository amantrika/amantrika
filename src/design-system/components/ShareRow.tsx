"use client";

import { useState } from "react";
import { Button } from "@/design-system/components";

/**
 * Share an invitation: WhatsApp, copy link, QR.
 *
 * WhatsApp first and visually heaviest, because it is what people will actually
 * use. Copy-link second for everyone else. The QR is a plain link to an SVG
 * route rather than an inline image, so this component ships no QR code and the
 * guest route stays light.
 *
 * `navigator.clipboard` needs a secure context and can be refused, so the copy
 * button falls back to selecting the text — never leaving a button that appears
 * to do nothing.
 */
export function ShareRow({
  whatsappUrl,
  url,
  qrUrl,
}: {
  whatsappUrl: string;
  url: string;
  qrUrl?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers, or a page the clipboard API refuses. Show the URL so it
      // can be copied by hand rather than pretending the button worked.
      window.prompt("Copy this link", url);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Anchor wrapping Button — the pattern the dashboard already uses; this
          Button renders a <button> and has no href of its own. */}
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
        <Button>Share on WhatsApp</Button>
      </a>
      <Button variant="secondary" onClick={copy}>
        {copied ? "Link copied" : "Copy link"}
      </Button>
      {qrUrl && (
        <a href={qrUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost">QR code</Button>
        </a>
      )}
    </div>
  );
}
