import { createClient } from "@/lib/supabase/server";
import { ShowcaseCuration, type CurationRow } from "./ShowcaseCuration";

/**
 * Curation queue. Consent makes an invitation *eligible*; publishing is still a
 * deliberate admin action, and what gets published is a sanitised clone.
 */
export default async function AdminShowcasePage() {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .is("showcase_source_id", null)
    .order("created_at", { ascending: false });

  const eligible = (events ?? []).filter((e) => e.permissions?.showcase_consent === true);

  // Consent history, so an admin can see what was agreed and when.
  const { data: consents } = eligible.length
    ? await supabase
        .from("showcase_consents")
        .select("event_id, granted, anonymise, created_at")
        .in("event_id", eligible.map((e) => e.id))
        .order("created_at", { ascending: false })
    : { data: [] };

  const latestConsent = new Map<string, { anonymise: boolean; at: string }>();
  for (const c of consents ?? []) {
    if (!latestConsent.has(c.event_id) && c.granted) {
      latestConsent.set(c.event_id, { anonymise: c.anonymise, at: c.created_at });
    }
  }

  const rows: CurationRow[] = eligible.map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    eventType: e.event_type,
    themeId: e.theme_id,
    city: e.city,
    isShowcased: e.is_showcased,
    anonymise: latestConsent.get(e.id)?.anonymise ?? true,
    consentedAt: latestConsent.get(e.id)?.at ?? null,
  }));

  return <ShowcaseCuration rows={rows} />;
}
