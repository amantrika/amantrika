import { siteUrl } from "@/lib/env";

/**
 * One HTML shell for every transactional email.
 *
 * Deliberately plain: tables and inline styles, no external CSS, no web fonts,
 * no images that must load. Gmail, Outlook and every Indian webmail client
 * strip more than they keep, and a nudge that renders as a wall of unstyled
 * text in Outlook has still done its job. Every message also ships a
 * plain-text twin, which is the version many people actually see.
 *
 * The spec asks for React Email components. This is the interim: same output
 * contract, no new dependency, and swapping the implementation later changes
 * this file only.
 */
export function emailLayout(input: {
  heading: string;
  /** Pre-escaped HTML. Callers own their own escaping. */
  body: string;
  cta?: { label: string; href: string };
}): string {
  const { heading, body, cta } = input;

  return [
    `<div style="margin:0;padding:24px;background:#faf7f2;font-family:Georgia,'Times New Roman',serif;color:#2b1d1d;">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e8ddcd;border-radius:8px;">`,
    `<tr><td style="padding:32px 32px 8px;">`,
    `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#7b2d3b;">${heading}</h1>`,
    `<div style="font-size:16px;line-height:1.6;">${body}</div>`,
    cta
      ? `<p style="margin:28px 0 8px;"><a href="${cta.href}" style="display:inline-block;padding:12px 22px;background:#7b2d3b;color:#ffffff;text-decoration:none;border-radius:999px;font-size:15px;">${cta.label}</a></p>`
      : "",
    `</td></tr>`,
    `<tr><td style="padding:8px 32px 28px;font-size:13px;line-height:1.5;color:#6b5a52;">`,
    `<p style="margin:16px 0 0;"><a href="${siteUrl}" style="color:#6b5a52;">Amantrika</a> — digital invitations for Indian celebrations</p>`,
    `</td></tr>`,
    `</table></div>`,
  ]
    .filter(Boolean)
    .join("");
}
