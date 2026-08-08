"use client";

import posthog from "posthog-js";
import { analyticsEnabled, posthogKey, posthogProxyPath } from "@/lib/env";
import type { EventName } from "./events";

let started = false;

/** Idempotent — React strict mode mounts effects twice in development. */
export function initPostHog() {
  if (started || !analyticsEnabled || typeof window === "undefined") return;
  started = true;

  posthog.init(posthogKey, {
    api_host: posthogProxyPath,
    // Absolute origin for the assets the snippet pulls in, so they also go
    // through our proxy rather than posthog.com.
    ui_host: "https://us.posthog.com",

    // We send pageviews ourselves from the provider: the App Router does
    // client-side navigation, which PostHog's automatic capture misses.
    capture_pageview: false,
    capture_pageleave: true,

    persistence: "localStorage+cookie",
    person_profiles: "identified_only",

    // Invitations contain guests' names, phone numbers and private messages.
    // Mask everything by default and opt individual elements back in with
    // `data-ph-capture-attribute` / the `ph-no-capture` class.
    autocapture: false,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-private]",
    },

    // Recording is enabled per-project in PostHog; keep it off for invite pages
    // via the provider rather than globally here.
    disable_session_recording: false,

    loaded: (ph) => {
      if (process.env.NODE_ENV === "development") ph.debug(false);
    },
  });
}

/** Safe in every environment: a no-op when analytics is not configured. */
export function capture(event: EventName, properties?: Record<string, unknown>) {
  if (!analyticsEnabled || typeof window === "undefined") return;
  posthog.capture(event, properties);
}

/** Links the anonymous device to a signed-in profile. */
export function identify(userId: string, properties?: Record<string, unknown>) {
  if (!analyticsEnabled || typeof window === "undefined") return;
  posthog.identify(userId, properties);
}

/** Call on sign-out so the next person on a shared device is a new anonymous id. */
export function resetIdentity() {
  if (!analyticsEnabled || typeof window === "undefined") return;
  posthog.reset();
}

export { posthog };
