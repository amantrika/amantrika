import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OnboardingClient } from "./OnboardingClient";
import { getCachedThemes } from "@/lib/cache";
import type { PlanRow } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Create your invitation · Amantrika",
  robots: { index: false },
};

export default async function OnboardingPage() {
  const profile = await requireProfile("/onboarding");

  const supabase = await createClient();
  const [{ data: plans }, themeCatalogue] = await Promise.all([
    supabase.from("plans").select("*").eq("is_active", true).order("sort_order"),
    // Which themes are offered and at what tier. Cached — it is the same list
    // for every host and changes when someone edits a row, not per request.
    getCachedThemes(),
  ]);

  return (
    <OnboardingClient
      plans={(plans ?? []) as PlanRow[]}
      themeCatalogue={themeCatalogue}
      isAgent={profile.role === "agent"}
    />
  );
}
