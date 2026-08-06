"use client";

import { Card, CoupleMonogram, CountdownTimer, Divider, EventTimelineItem, RSVPForm, Stat } from "@/design-system/components";
import { getCouple } from "@/data/couples";
import { getTheme } from "@/themes";
import { DsSection } from "../shell";

export default function PatternsPage() {
  const couple = getCouple("swarnil-weds-prachi");
  const theme = getTheme(couple.themeId);

  return (
    <>
      <p className="type-overline">Composed patterns</p>
      <h1 className="mb-10 mt-1 type-display-lg text-primary">Patterns</h1>

      <DsSection title="Invite hero" lead="CoupleMonogram + display-xl names + greeting line + ornate divider.">
        <Card variant="ornate" className="p-10 text-center">
          <CoupleMonogram initials={["S", "P"]} ring={theme.monogramRing} className="mx-auto size-24 text-accent" />
          <p className="mt-4 font-deva text-xl text-accent">{theme.greetingCopy}</p>
          <h3 className="mt-2 type-display-lg text-primary">
            {couple.partner1.name} <span className="type-verse text-accent">weds</span> {couple.partner2.name}
          </h3>
          <p className="mt-2 type-body-lg text-muted">24 November 2026 · {couple.city}</p>
          <Divider variant="motif" motif={theme.motifSet.divider} className="mx-auto mt-6 max-w-sm" />
        </Card>
      </DsSection>

      <DsSection title="Countdown block" lead="CountdownTimer under an overline label.">
        <Card className="p-10 text-center">
          <p className="type-overline mb-6">The celebration begins in</p>
          <CountdownTimer target={couple.mainDate} />
        </Card>
      </DsSection>

      <DsSection title="Events timeline" lead="Stacked EventTimelineItems with theme vocabulary.">
        <div className="flex flex-col gap-4">
          {couple.events.slice(0, 2).map((ev) => (
            <EventTimelineItem key={ev.id} event={ev} />
          ))}
        </div>
      </DsSection>

      <DsSection title="RSVP section" lead="RSVPForm with theme meal options.">
        <RSVPForm events={couple.events} mealOptions={theme.mealOptions} />
      </DsSection>

      <DsSection title="Admin stat row" lead="Stat cards with sparklines — the one place that may feel slightly dashboard.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Invite views" value="2,431" delta={18} spark={[42, 58, 51, 96, 132, 118, 154, 171]} />
          <Stat label="Unique guests" value={178} delta={9} />
          <Stat label="RSVP yes" value={112} delta={6} />
          <Stat label="Headcount" value={286} delta={-2} />
        </div>
      </DsSection>
    </>
  );
}
