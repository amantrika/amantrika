import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OnboardingClient } from "./OnboardingClient";
import type { PlanRow } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Create your invitation · Amantrika",
  robots: { index: false },
};

export default async function OnboardingPage() {
  const profile = await requireProfile("/onboarding");

  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  return (
    <OnboardingClient
      plans={(plans ?? []) as PlanRow[]}
      isAgent={profile.role === "agent"}
    />
  );
}
