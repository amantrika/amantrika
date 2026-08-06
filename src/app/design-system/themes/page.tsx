"use client";

import Link from "next/link";
import { themes } from "@/themes";
import { useTheme } from "@/design-system/ThemeProvider";
import { Badge, Button, Card, CoupleMonogram } from "@/design-system/components";
import { motifs } from "@/design-system/motifs";
import { DsSection } from "../shell";

export default function ThemesPage() {
  const { theme: active, setThemeId } = useTheme();

  return (
    <>
      <p className="type-overline">Theme engine</p>
      <h1 className="mb-4 mt-1 type-display-lg text-primary">Themes</h1>
      <p className="mb-10 max-w-2xl type-body-lg text-muted">
        Eight complete themes. Each overrides only the semantic tokens and brings its own motifs,
        petals, event vocabulary, meal options and greeting script — never just a recolor.
      </p>

      <DsSection title="Gallery" lead="Apply a theme to this whole site, or preview it on a live invite.">
        <div className="grid gap-5 sm:grid-cols-2">
          {themes.map((t) => {
            const Corner = motifs[t.motifSet.corner];
            const DividerMotif = motifs[t.motifSet.divider];
            const isActive = t.id === active.id;
            return (
              <Card key={t.id} variant={isActive ? "ornate" : "plain"} className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="type-h2 text-primary">{t.name}</h3>
                    <p className="type-caption">{t.regionTag}</p>
                  </div>
                  <CoupleMonogram initials={["S", "P"]} ring={t.monogramRing} className="size-14 shrink-0 text-primary" />
                </div>

                <div className="mt-4 flex h-8 overflow-hidden rounded-soft border border-ornate/40">
                  {t.palette.map((hex) => (
                    <span key={hex} className="flex-1" style={{ background: hex }} title={hex} />
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="primary">{t.religionTag}</Badge>
                  <Badge tone="accent">{t.moodTag}</Badge>
                  <Badge>{t.petalType} petals</Badge>
                  <Badge>{t.frameStyle} frames</Badge>
                </div>

                <div className="mt-4 flex items-center gap-3 text-primary">
                  <Corner className="size-6" />
                  <DividerMotif className="size-6" />
                  <span className="type-caption">{t.eventVocabulary.join(" · ")}</span>
                </div>

                <div className="mt-5 flex gap-2">
                  <Button size="sm" variant={isActive ? "primary" : "secondary"} onClick={() => setThemeId(t.id)}>
                    {isActive ? "Active" : "Apply here"}
                  </Button>
                  <Link href={`/invite/swarnil-weds-prachi?theme=${t.id}`}>
                    <Button size="sm" variant="ghost">Preview invite →</Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </DsSection>
    </>
  );
}
