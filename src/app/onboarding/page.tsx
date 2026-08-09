import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OnboardingClient } from "./OnboardingClient";
import { getCachedAthemes, getCachedThemes } from "@/lib/cache";
import { toAthemeCards } from "@/lib/themes/atheme";
import type { PlanRow } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Create your invitation · Amantrika",
  robots: { index: false },
};

export default async function OnboardingPage({
  searchParams,
}: {
  /** `?theme=` carries a choice made in the landing-page gallery. */
  searchParams: Promise<{ theme?: string }>;
}) {
  const profile = await requireProfile("/onboarding");

  const supabase = await createClient();
  const [{ data: plans }, themeCatalogue, athemes, params] = await Promise.all([
    supabase.from("plans").select("*").eq("is_active", true).order("sort_order"),
    // Which themes are offered and at what tier. Cached — it is the same list
    // for every host and changes when someone edits a row, not per request.
    getCachedThemes(),
    // The photographed designs shown above the picker.
    getCachedAthemes(),
    searchParams,
  ]);

  const premiumThemeIds = new Set(
    themeCatalogue.filter((t) => t.tier === "premium").map((t) => t.id)
  );

  /**
   * Validated against the catalogue before it reaches the client.
   *
   * A theme id arrives here in a query string, which anyone can type. Trusting
   * it would put an unoffered — or nonexistent — id into the draft, and from
   * there into `events.theme_id`, where the foreign key would reject it at save
   * time with nothing useful to say. An unrecognised value is dropped and the
   * host simply starts on the default.
   */
  const requestedTheme = params.theme;
  const initialThemeId =
    requestedTheme && themeCatalogue.some((t) => t.id === requestedTheme)
      ? requestedTheme
      : undefined;

  return (
    <OnboardingClient
      plans={(plans ?? []) as PlanRow[]}
      themeCatalogue={themeCatalogue}
      athemes={toAthemeCards(athemes, premiumThemeIds)}
      initialThemeId={initialThemeId}
      isAgent={profile.role === "agent"}
    />
  );
}
