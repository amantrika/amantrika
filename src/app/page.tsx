import type { Metadata } from "next";
import { getProfile, homeFor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LandingClient } from "./LandingClient";
import type { PlanRow } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Amantrika · Digital invitations for every celebration",
  description:
    "Animated invitation websites that open like a real card. Weddings, engagements, birthdays and more — one link, every blessing, RSVPs and analytics included.",
};

export default async function LandingPage() {
  const profile = await getProfile();

  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  return (
    <LandingClient
      plans={(plans ?? []) as PlanRow[]}
      signedIn={Boolean(profile)}
      dashboardHref={profile ? homeFor(profile.role) : "/login"}
    />
  );
}
