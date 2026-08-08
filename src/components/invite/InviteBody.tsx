"use client";

import { LayoutSection, ThemedHeroVariant } from "@/design-system/components";
import { hostLine, type InviteView } from "@/lib/invite";
import { monogramInitials } from "@/lib/invite";
import { resolveSectionStyle, type Theme } from "@/themes";
import { renderSection, type SectionContext } from "./sections";

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

      {layout.order.map((id, index) => {
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
