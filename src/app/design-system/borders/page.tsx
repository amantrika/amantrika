"use client";

import { DecorativeBorder, borderStyles } from "@/design-system/components/borders";
import { useToast } from "@/design-system/components";
import { DsSection } from "../shell";

export default function BordersPage() {
  const { toast } = useToast();

  return (
    <>
      <p className="type-overline">Border designs</p>
      <h1 className="mb-4 mt-1 type-display-lg text-primary">Borders</h1>
      <p className="mb-10 max-w-2xl type-body-lg text-muted">
        {borderStyles.length} card-border styles — line rules, moti beads, temple zigzag, jaali key,
        floral vine, rope twist, postage perforation. Each edge is masked from the theme&apos;s ornate
        color, so every design recolors per theme. Click a card to copy its usage.
      </p>

      <DsSection title="Style library" lead='Usage: <DecorativeBorder variant="beads">…</DecorativeBorder>'>
        <div className="grid gap-6 sm:grid-cols-2">
          {borderStyles.map((b) => (
            <button
              key={b.name}
              onClick={() => {
                navigator.clipboard?.writeText(`<DecorativeBorder variant="${b.name}">…</DecorativeBorder>`);
                toast(`Copied ${b.name} border`, "success");
              }}
              className="group text-left cursor-pointer"
            >
              <DecorativeBorder variant={b.name} className="transition-shadow group-hover:shadow-gold-glow">
                <p className="text-center font-display text-xl font-semibold text-primary">{b.label}</p>
                <p className="mt-1 text-center type-caption">{b.note}</p>
              </DecorativeBorder>
              <p className="mt-2 text-center font-mono text-xs text-muted">variant=&quot;{b.name}&quot;</p>
            </button>
          ))}
        </div>
      </DsSection>

      <DsSection title="With textures" lead="Borders + textures compose into finished card faces.">
        <div className="grid gap-6 sm:grid-cols-2">
          <DecorativeBorder variant="beads" className="texture-silk">
            <p className="text-center type-overline">Save the date</p>
            <p className="mt-2 text-center type-script text-4xl text-primary">Swarnil &amp; Prachi</p>
          </DecorativeBorder>
          <DecorativeBorder variant="meander" className="texture-linen">
            <p className="text-center type-overline">Valima</p>
            <p className="mt-2 text-center font-display text-3xl font-semibold text-primary">Ahmed &amp; Fatima</p>
          </DecorativeBorder>
        </div>
      </DsSection>
    </>
  );
}
