"use client";

import { PatternBackground, patternNames } from "@/design-system/patterns";
import { themes } from "@/themes";
import { useToast } from "@/design-system/components";
import { DsSection } from "../shell";

export default function PatternsPage() {
  const { toast } = useToast();

  return (
    <>
      <p className="type-overline">Background patterns</p>
      <h1 className="mb-4 mt-1 type-display-lg text-primary">Patterns</h1>
      <p className="mb-10 max-w-2xl type-body-lg text-muted">
        Repeating SVG textures — one visual language per theme: paisley damask for royal maroon,
        star jaali for nikah, phulkari for Anand Karaj, kolam steps for temple south. All render in
        `currentColor` at low opacity over the paper.
      </p>

      <DsSection title="Gallery" lead="Click a tile to copy its usage snippet.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {patternNames.map((name) => {
            const usedBy = themes.filter((t) => t.pattern === name).map((t) => t.name);
            return (
              <button
                key={name}
                onClick={() => {
                  navigator.clipboard?.writeText(`<PatternBackground name="${name}" className="text-accent opacity-[0.07]" />`);
                  toast(`Copied ${name} snippet`, "success");
                }}
                className="group overflow-hidden rounded-card border border-ornate/40 bg-surface text-left transition-shadow hover:shadow-gold-glow cursor-pointer"
              >
                <div className="relative h-36 paper-texture">
                  <PatternBackground name={name} className="text-primary opacity-20 transition-opacity group-hover:opacity-35" />
                </div>
                <div className="border-t border-ornate/30 p-4">
                  <p className="font-mono text-sm font-bold">{name}</p>
                  <p className="type-caption">{usedBy.length ? `Theme: ${usedBy.join(", ")}` : "Universal"}</p>
                </div>
              </button>
            );
          })}
        </div>
      </DsSection>

      <DsSection title="In context" lead="A pattern wash sits behind content at 6–8% opacity — felt, not read.">
        <div className="relative overflow-hidden rounded-card ornate-border paper-texture p-12 text-center">
          <PatternBackground name="paisley-damask" className="text-accent opacity-[0.08]" />
          <p className="relative type-display-lg text-primary">Swarnil <span className="type-script text-accent" style={{ fontSize: "0.55em" }}>weds</span> Prachi</p>
          <p className="relative mt-2 type-overline">24 November 2026 · Jaipur</p>
        </div>
      </DsSection>
    </>
  );
}
