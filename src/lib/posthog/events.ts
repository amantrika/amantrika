/**
 * Every product event Amantrika emits, in one place.
 *
 * Naming: `object_verb`, past tense, snake_case — PostHog's own convention, and
 * it keeps related events adjacent when the list is sorted alphabetically.
 *
 * Privacy rule for this file: properties describe *behaviour*, never people.
 * Guest names, emails, phone numbers, blessing text and RSVP messages stay in
 * Postgres and are never sent to PostHog. Counts, enums, booleans and ids are
 * fine; free text written by a guest is not.
 */

export const EVENTS = {
  /* acquisition */
  signup_started: "signup_started",
  signup_completed: "signup_completed",
  signin_completed: "signin_completed",
  signed_out: "signed_out",

  /* the build funnel */
  onboarding_started: "onboarding_started",
  onboarding_step_viewed: "onboarding_step_viewed",
  onboarding_occasion_chosen: "onboarding_occasion_chosen",
  onboarding_theme_previewed: "onboarding_theme_previewed",
  onboarding_theme_chosen: "onboarding_theme_chosen",
  invite_slug_checked: "invite_slug_checked",
  invite_draft_saved: "invite_draft_saved",
  invite_published: "invite_published",
  invite_status_changed: "invite_status_changed",
  invite_settings_changed: "invite_settings_changed",

  /* assets */
  asset_upload_started: "asset_upload_started",
  asset_uploaded: "asset_uploaded",
  asset_upload_failed: "asset_upload_failed",
  asset_deleted: "asset_deleted",

  /* the guest side */
  invite_opened: "invite_opened",
  invite_envelope_opened: "invite_envelope_opened",
  rsvp_submitted: "rsvp_submitted",
  blessing_submitted: "blessing_submitted",
  invite_link_copied: "invite_link_copied",
  invite_shared: "invite_shared",
  badge_clicked: "badge_clicked",

  /* member profile */
  profile_updated: "profile_updated",
  partner_applied: "partner_applied",

  /* community roadmap */
  feature_proposed: "feature_proposed",
  feature_voted: "feature_voted",
  feature_status_changed: "feature_status_changed",

  /* host tooling */
  guest_added: "guest_added",
  guests_imported: "guests_imported",
  guest_link_copied: "guest_link_copied",
  blessing_moderated: "blessing_moderated",

  /* money */
  checkout_started: "checkout_started",
  plan_selected: "plan_selected",
  order_paid: "order_paid",

  /* partner programme */
  agent_referral_copied: "agent_referral_copied",

  /* admin control plane */
  admin_role_changed: "admin_role_changed",
  admin_partner_reviewed: "admin_partner_reviewed",
  admin_invitation_moderated: "admin_invitation_moderated",
  admin_showcase_curated: "admin_showcase_curated",
  admin_plan_updated: "admin_plan_updated",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

/** Properties attached to every event, so funnels can be sliced consistently. */
export interface BaseProperties {
  [key: string]: unknown;
}
