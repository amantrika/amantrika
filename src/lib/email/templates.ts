/**
 * Transactional email templates — the source of truth.
 *
 * These live in the repo, not in the AWS console, and are pushed to SES by
 * `scripts/aws-ses-templates.ts`. Editing a template in the console would put
 * the live wording somewhere code review cannot see it, which is how the copy
 * on a payment receipt quietly stops matching the product.
 *
 * ## SNS is not the tool for this
 *
 * Amazon SNS is a pub/sub notification bus — it fans a message out to
 * subscribers (a queue, a Lambda, an HTTPS endpoint, or a raw email address). It
 * has no templating, no HTML bodies, no per-recipient personalisation, and its
 * email output is plain text from a noreply address that people cannot reply
 * to. It is the wrong shape for "here is your receipt, Priya".
 *
 * **SES** is the transactional email service, and it has exactly the templating
 * this needs: named templates with `{{handlebars}}` placeholders, rendered
 * per-recipient at send time.
 *
 * SNS *does* have a real job here, and it is the reverse direction: SES
 * publishes **bounce and complaint events** to an SNS topic so the app can stop
 * mailing an address that hard-bounced. Ignoring those is the fastest way to
 * destroy a sending reputation. That topic is created by the same script.
 *
 * ## Why `{{placeholders}}` rather than building HTML in TypeScript
 *
 * Templates rendered by SES keep the body out of the Lambda payload, so a
 * send is a few hundred bytes rather than 40KB of inlined HTML, and the wording
 * can be corrected without a deploy. The trade is that the placeholders are
 * stringly-typed — which is what `TemplateData` below exists to fix.
 */

export interface EmailTemplate {
  /** The name SES stores it under. Prefixed so it is obvious whose it is. */
  name: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Shared shell. Inline styles only: Gmail, Outlook and every Indian mail client
 * strip `<style>` blocks, so a stylesheet is a stylesheet nobody sees.
 */
function layout(body: string): string {
  return `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#faf6ef;font-family:Georgia,'Times New Roman',serif;color:#3d2b1f">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ef;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf8;border:1px solid #e8dcc8;border-radius:12px;padding:32px">
        <tr><td style="text-align:center;padding-bottom:24px">
          <span style="font-size:24px;color:#7b1e2b;letter-spacing:0.5px">Amantrika</span>
        </td></tr>
        <tr><td style="font-size:16px;line-height:1.6">${body}</td></tr>
        <tr><td style="padding-top:32px;border-top:1px solid #e8dcc8;margin-top:24px">
          <p style="font-size:12px;color:#8a7a68;margin:16px 0 0">
            Amantrika · digital invitations for Indian celebrations
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const button = (url: string, label: string) =>
  `<p style="text-align:center;margin:28px 0">
     <a href="${url}" style="background:#7b1e2b;color:#fffdf8;text-decoration:none;padding:12px 28px;border-radius:8px;display:inline-block;font-size:15px">${label}</a>
   </p>`;

/* ------------------------------------------------------------- the templates */

/**
 * Sent once, after a new account is confirmed.
 *
 * Deliberately *not* a "someone signed in" alert. A notification on every
 * sign-in trains people to ignore security email, and this product has no
 * threat model that justifies it. If that changes, the trigger should be an
 * *unrecognised* sign-in, not every one.
 */
export const welcomeTemplate: EmailTemplate = {
  name: "amantrika-welcome",
  subject: "Welcome to Amantrika, {{name}}",
  html: layout(`
    <p>Namaste {{name}},</p>
    <p>Your Amantrika account is ready. You can now build an invitation, choose a
       theme, and share one link with everyone you love.</p>
    ${button("{{dashboardUrl}}", "Start your invitation")}
    <p style="color:#8a7a68;font-size:14px">Your first invitation takes about ten minutes.</p>`),
  text: `Namaste {{name}},

Your Amantrika account is ready. You can now build an invitation, choose a theme,
and share one link with everyone you love.

Start here: {{dashboardUrl}}

Your first invitation takes about ten minutes.`,
};

/**
 * Sent by the payment webhook — never by the browser callback.
 *
 * `CLAUDE.md` §2.3: the webhook is the only thing that may treat a payment as
 * real. A receipt sent from the browser redirect would go out for payments that
 * later failed.
 */
export const paymentReceiptTemplate: EmailTemplate = {
  name: "amantrika-payment-receipt",
  subject: "Your Amantrika receipt — {{inviteTitle}}",
  html: layout(`
    <p>Namaste {{name}},</p>
    <p>Thank you — your payment has gone through and <strong>{{inviteTitle}}</strong>
       is now live without the watermark.</p>
    <table role="presentation" width="100%" style="margin:24px 0;font-size:15px">
      <tr><td style="padding:6px 0;color:#8a7a68">Plan</td><td align="right">{{planName}}</td></tr>
      <tr><td style="padding:6px 0;color:#8a7a68">Amount</td><td align="right">₹{{amount}}</td></tr>
      <tr><td style="padding:6px 0;color:#8a7a68">Payment ID</td><td align="right" style="font-family:monospace;font-size:13px">{{paymentId}}</td></tr>
    </table>
    ${button("{{inviteUrl}}", "View your invitation")}
    <p style="color:#8a7a68;font-size:14px">Keep this email — it is your receipt.</p>`),
  text: `Namaste {{name}},

Thank you — your payment has gone through and {{inviteTitle}} is now live
without the watermark.

Plan:       {{planName}}
Amount:     Rs {{amount}}
Payment ID: {{paymentId}}

View it: {{inviteUrl}}

Keep this email — it is your receipt.`,
};

/**
 * Sent to the host when a guest replies.
 *
 * Carries the guest's name and headcount but **never their phone number**:
 * that is guest PII and belongs only in the owner's authenticated dashboard
 * (`CLAUDE.md` §2.12). Email is forwarded, screenshotted and left open on
 * shared laptops.
 */
export const rsvpReceivedTemplate: EmailTemplate = {
  name: "amantrika-rsvp-received",
  subject: "{{guestName}} replied to {{inviteTitle}}",
  html: layout(`
    <p>Namaste {{name}},</p>
    <p><strong>{{guestName}}</strong> has replied to {{inviteTitle}}.</p>
    <table role="presentation" width="100%" style="margin:24px 0;font-size:15px">
      <tr><td style="padding:6px 0;color:#8a7a68">Attending</td><td align="right">{{attending}}</td></tr>
      <tr><td style="padding:6px 0;color:#8a7a68">Guests</td><td align="right">{{headcount}}</td></tr>
    </table>
    ${button("{{dashboardUrl}}", "See all replies")}`),
  text: `Namaste {{name}},

{{guestName}} has replied to {{inviteTitle}}.

Attending: {{attending}}
Guests:    {{headcount}}

See all replies: {{dashboardUrl}}`,
};

export const templates = [
  welcomeTemplate,
  paymentReceiptTemplate,
  rsvpReceivedTemplate,
] as const;

/**
 * The placeholders each template expects.
 *
 * SES silently renders a missing placeholder as an empty string — "Namaste ,"
 * goes out and nothing anywhere reports an error. This type is what turns that
 * into a compile error instead.
 */
export interface TemplateData {
  "amantrika-welcome": { name: string; dashboardUrl: string };
  "amantrika-payment-receipt": {
    name: string;
    inviteTitle: string;
    planName: string;
    amount: string;
    paymentId: string;
    inviteUrl: string;
  };
  "amantrika-rsvp-received": {
    name: string;
    guestName: string;
    inviteTitle: string;
    attending: string;
    headcount: string;
    dashboardUrl: string;
  };
}
