"use client";

import { LayoutSection, ThemedHeroVariant } from "@/design-system/components";
import { hostLine, type InviteView } from "@/lib/invites/invite";
import { monogramInitials } from "@/lib/invites/invite";
import { resolveSectionStyle, type SectionId, type Theme } from "@/themes";
import { entitlementsFor, type Entitlements } from "@/lib/invites/entitlements";
import { renderSection, type SectionContext } from "./sections";

/**
 * Sections a plan can withhold, and the entitlement that decides. Anything not
 * listed here is part of every invitation — the free tier is a card that can be
 * read and shared, and what it lacks is the machinery for replying.
 *
 * The theme still *declares* these sections in its layout; they are filtered
 * out at render. That way a theme never has to know what a plan costs, which is
 * the rule that keeps `theme.layout` about structure and nothing else.
 */
const GATED_SECTIONS: Partial<Record<SectionId, keyof Entitlements>> = {
  rsvp: "rsvp",
  blessings: "blessingWall",
};

/**
 * The invitation itself — hero plus sections, laid out by the theme.
 *
 * Shared deliberately between the live guest page and the onboarding theme
 * chooser. A preview that re-implements the invitation is a preview that
 * eventually lies about it; this one *is* the invitation, with inert handlers.
 */
export function InviteBody({
  invite,
  theme,
  blessings,
  guestName,
  onOpenPhoto,
  onRsvp,
  onBlessing,
}: {
  invite: InviteView;
  theme: Theme;
  blessings: SectionContext["blessings"];
  guestName?: string;
  onOpenPhoto: SectionContext["onOpenPhoto"];
  onRsvp: SectionContext["onRsvp"];
  onBlessing: SectionContext["onBlessing"];
}) {
  const layout = theme.layout;
  // Derived from the invitation rather than passed in, so no caller can render
  // a preview that promises a feature the plan does not include.
  const entitlements = entitlementsFor(invite.planCode);
  const order = layout.order.filter((id) => {
    const flag = GATED_SECTIONS[id];
    return !flag || entitlements[flag];
  });
  const names = hostLine(invite.hosts);
  const initials = monogramInitials(invite.hosts);
  const hero = invite.photos[0];

  const dateLabel = new Date(invite.mainDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const base: Omit<SectionContext, "align"> = {
    invite,
    theme,
    blessings,
    guestName,
    onOpenPhoto,
    onRsvp,
    onBlessing,
  };

  return (
    <>
      <ThemedHeroVariant
        theme={theme}
        names={invite.hosts.map((h) => h.name)}
        joiner={invite.eventType === "wedding" ? "weds" : "&"}
        initials={initials}
        dateLabel={dateLabel}
        city={invite.city}
        hashtag={invite.hashtag}
        guestName={guestName}
        photoUrl={hero?.url}
        photoAlt={hero?.caption ?? (names ? `${names} — photograph` : "Photograph")}
      />

      {order.map((id, index) => {
        const style = resolveSectionStyle(layout, id);
        const rendered = renderSection(id, { ...base, align: style.align });
        if (!rendered) return null;
        return (
          <LayoutSection
            key={id}
            id={id}
            theme={theme}
            style={style}
            index={index}
            overline={rendered.overline}
            title={rendered.title}
          >
            {rendered.body}
          </LayoutSection>
        );
      })}
    </>
  );
}
