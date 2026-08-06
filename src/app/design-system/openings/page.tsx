"use client";

import { useState } from "react";
import { Button, Card, ThemedOpening, openStyleLabels } from "@/design-system/components";
import { themes, type OpenStyle } from "@/themes";
import { useTheme } from "@/design-system/ThemeProvider";
import { DsSection } from "../shell";

/** One replayable opening demo, scoped to its own theme's tokens. */
function OpeningDemo({ themeId, style }: { themeId: string; style: OpenStyle }) {
  const [key, setKey] = useState(0);
  const [opened, setOpened] = useState(false);
  const theme = themes.find((t) => t.id === themeId)!;

  return (
    <Card className="h-full overflow-hidden p-0">
      {/* data-theme scopes ALL of this theme's tokens to the preview box:
          colors, fonts, tracking, radius, rhythm — exactly as on a real invite */}
      <div data-theme={theme.id} data-mood={theme.moodTag} className="flex h-full flex-col bg-bg p-5">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <div>
            <p className="type-overline">{theme.name}</p>
            <p className="font-display text-lg font-semibold text-primary">{openStyleLabels[style]}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setOpened(false);
              setKey((k) => k + 1);
            }}
          >
            Replay
          </Button>
        </div>
        <ThemedOpening
          key={key}
          theme={theme}
          style={style}
          guestName="Rahul & Family"
          onOpened={() => setOpened(true)}
        />
        <p className="mt-3 type-caption">
          {opened ? "Opened — hit Replay to watch again." : "Tap the card to open."}
        </p>
        <span className="flex-1" />
      </div>
    </Card>
  );
}

export default function OpeningsPage() {
  const { theme: active } = useTheme();

  return (
    <>
      <p className="type-overline">The grand moment</p>
      <h1 className="mb-4 mt-1 type-display-lg text-primary">Openings</h1>
      <p className="mb-10 max-w-2xl type-body-lg text-muted">
        Every theme opens differently. A Hindu royal invite breaks a wax seal; a haldi invite bursts
        into marigolds; Nikah Emerald parts jaali gates; Cathedral White swings church doors. Each
        preview below is scoped to its own theme, so you also see that theme&apos;s fonts, tracking,
        radius and material — not just its colors.
      </p>

      <DsSection
        title="One per theme"
        lead={`The active theme (${active.name}) uses "${openStyleLabels[active.openStyle]}" — set by its openStyle token.`}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {themes.map((t) => (
            <OpeningDemo key={t.id} themeId={t.id} style={t.openStyle} />
          ))}
        </div>
      </DsSection>

      <DsSection title="How it works" lead="openStyle is a Theme token, so the invite page never branches on theme.">
        <pre className="overflow-x-auto rounded-card border border-ornate/40 bg-surface p-5 text-sm">
{`// src/themes/index.ts
{
  id: "nikah-emerald",
  borderStyle: "meander",      // its signature card border
  texture: "texture-linen",    // its card material
  pattern: "star-jaali",       // its background wash
  openStyle: "jaali-gates",    // its opening animation
  …
}

// the invite page just renders:
<ThemedOpening theme={theme} guestName={guest} onOpened={reveal} />`}
        </pre>
      </DsSection>
    </>
  );
}
