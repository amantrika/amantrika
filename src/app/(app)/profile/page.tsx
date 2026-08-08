import type { Metadata } from "next";
import { DashboardShell } from "../DashboardShell";
import { ProfileForm } from "./ProfileForm";
import { PartnerPanel, type PartnerState } from "./PartnerPanel";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCachedPlans } from "@/lib/cache";

export const metadata: Metadata = {
  title: "Your profile · Amantrika",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const profile = await requireProfile("/profile");
  const supabase = await createClient();

  const [{ data: partnerRaw }, plans] = await Promise.all([
    supabase.rpc("my_partner_status"),
    getCachedPlans(),
  ]);

  const partner = (partnerRaw ?? null) as PartnerState | null;

  // The cheapest paid plan anchors the partner maths — quoting the dearest one
  // would overstate the margin.
  const paidPlans = plans.filter((p) => p.price_inr > 0);
  const anchor = paidPlans.length
    ? paidPlans.reduce((a, b) => (a.price_inr <= b.price_inr ? a : b))
    : null;

  return (
    <DashboardShell
      profile={profile}
      title="Your profile"
      subtitle="How you appear to us, and to anyone you work with."
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <ProfileForm
          initial={{
            fullName: profile.full_name ?? "",
            phone: profile.phone ?? "",
            city: profile.city ?? "",
            instagram: profile.instagram ?? "",
            occasionNote: profile.occasion_note ?? "",
            bio: profile.bio ?? "",
          }}
          email={profile.email}
        />

        <PartnerPanel
          role={profile.role}
          partner={partner}
          anchorPlanName={anchor?.name ?? null}
          anchorPriceInr={anchor?.price_inr ?? null}
        />
      </div>
    </DashboardShell>
  );
}
