"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PostHogProvider as Provider } from "posthog-js/react";
import { analyticsEnabled } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { initPostHog, identify, posthog, resetIdentity } from "./client";

/**
 * Identity passed down from the server layout. Undefined for signed-out
 * visitors, which covers every guest opening an invitation.
 */
export interface AnalyticsIdentity {
  id: string;
  role: string;
  /** Domain of the email only — never the address itself. */
  emailDomain?: string;
}

/**
 * The App Router navigates on the client, so PostHog's automatic pageview
 * capture only ever sees the first load. We capture on every pathname change
 * instead.
 *
 * `useSearchParams` opts a component into client-side rendering, so this lives
 * in its own Suspense-wrapped child — otherwise every page in the tree would be
 * forced dynamic.
 */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!analyticsEnabled || !pathname) return;

    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;

    posthog.capture("$pageview", {
      $current_url: window.origin + url,
      pathname,
      // Which broad area of the product this is — cheap to group by later.
      section: sectionFor(pathname),
    });
  }, [pathname, searchParams]);

  return null;
}

/** Coarse grouping used on every pageview so funnels can filter by area. */
function sectionFor(pathname: string): string {
  if (pathname.startsWith("/invite/")) return "invite";
  if (pathname.startsWith("/onboarding")) return "onboarding";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/agent")) return "agent";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/blog")) return "blog";
  if (pathname.startsWith("/design-system")) return "design-system";
  if (pathname === "/login" || pathname === "/signup") return "auth";
  if (pathname === "/") return "landing";
  return "other";
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  /**
   * Identity is read from the browser session rather than passed down from the
   * root layout. Doing it server-side would make every page dynamic (the layout
   * would have to read cookies), and this also reacts to sign-in and sign-out
   * without a reload.
   */
  useEffect(() => {
    if (!analyticsEnabled) return;
    const supabase = createClient();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;

      if (!user) {
        // Reset only on a real sign-out, so a shared device doesn't merge two
        // people. An initial anonymous load has nothing to reset.
        if (event === "SIGNED_OUT") resetIdentity();
        return;
      }

      const next: AnalyticsIdentity = {
        id: user.id,
        role: (user.user_metadata?.role as string) ?? "host",
        emailDomain: user.email?.split("@")[1]?.toLowerCase(),
      };
      identify(next.id, { role: next.role, email_domain: next.emailDomain });
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  if (!analyticsEnabled) return <>{children}</>;

  return (
    <Provider client={posthog}>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </Provider>
  );
}
