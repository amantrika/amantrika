/**
 * Sharing an invitation.
 *
 * WhatsApp is not one channel among several here — it is how an Indian wedding
 * invitation actually travels. The link is forwarded from the couple to a
 * parent, to a family group of sixty, to an uncle who forwards it again. Every
 * decision below follows from that.
 */

export interface ShareText {
  message: string;
  whatsappUrl: string;
  url: string;
}

/**
 * Build the share message.
 *
 * The names and date go in the *text*, not only the link. A forwarded bare URL
 * arrives with no context — the recipient sees an unfamiliar domain and often
 * does not open it. "Meera & Arjun invite you — 7 November, Udaipur" survives
 * three forwards intact.
 *
 * `api.whatsapp.com/send` rather than `whatsapp://`: the custom scheme fails
 * silently on desktop, and half a wedding party opens links on a laptop.
 */
export function buildShare(input: {
  hostLine: string;
  dateLabel?: string;
  city?: string;
  url: string;
}): ShareText {
  const when = [input.dateLabel, input.city].filter(Boolean).join(" · ");

  const message = [
    `${input.hostLine} invite you to their celebration 🪔`,
    when,
    "",
    input.url,
    "",
    "Do open the link for the full schedule, venue and to let us know you're coming.",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return {
    message,
    whatsappUrl: `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`,
    url: input.url,
  };
}
