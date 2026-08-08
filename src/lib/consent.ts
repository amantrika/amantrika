/**
 * The exact wording shown beside the showcase checkbox.
 *
 * Stored verbatim on every `showcase_consents` row, so if this copy is ever
 * reworded we still know precisely what was promised at the moment someone
 * agreed. Change the constant and the UI together — never one alone.
 *
 * It lives outside `actions.ts` because a `"use server"` module may only export
 * async functions.
 */
export const SHOWCASE_CONSENT_TEXT =
  "Can we feature your invitation in our public gallery? We'll create a copy with your address, phone numbers, and payment details removed. You can withdraw this at any time.";

export const SHOWCASE_ANONYMISE_TEXT =
  "Use first names only. Leave this ticked if you'd rather your surnames weren't shown.";
