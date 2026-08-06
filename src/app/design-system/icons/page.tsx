"use client";

import { icons } from "@/design-system/icons";
import { useToast } from "@/design-system/components";
import { DsSection } from "../shell";

export default function IconsPage() {
  const { toast } = useToast();

  return (
    <>
      <p className="type-overline">Custom iconography</p>
      <h1 className="mb-4 mt-1 type-display-lg text-primary">Icons</h1>
      <p className="mb-10 max-w-2xl type-body-lg text-muted">
        {Object.keys(icons).length} hand-drawn wedding icons that generic icon sets don&apos;t have —
        shehnai, doli, varmala, mandap, kaleera and more. Stroke-based, `currentColor`, 48×48 grid.
        Click any icon to copy its import.
      </p>

      <DsSection title="Gallery" lead='Usage: import { icons } from "@/design-system/icons" — or import each icon by name.'>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Object.entries(icons).map(([name, Icon]) => (
            <button
              key={name}
              onClick={() => {
                navigator.clipboard?.writeText(`import { icons } from "@/design-system/icons"; // icons["${name}"]`);
                toast(`Copied ${name}`, "success");
              }}
              className="group flex flex-col items-center gap-2.5 rounded-card border border-ornate/40 bg-surface p-4 transition-shadow hover:shadow-gold-glow cursor-pointer"
            >
              <Icon className="size-10 text-primary transition-colors group-hover:text-accent" />
              <span className="type-caption break-all text-center">{name}</span>
            </button>
          ))}
        </div>
      </DsSection>

      <DsSection title="Sizing & color" lead="Icons scale crisply and inherit the text color of their parent.">
        <div className="flex flex-wrap items-end gap-8 rounded-card border border-ornate/40 bg-surface p-8">
          {[5, 8, 12, 16].map((s) => {
            const Shehnai = icons.shehnai;
            return <Shehnai key={s} className={`size-${s} ${s > 8 ? "text-accent" : "text-primary"}`} />;
          })}
          {(() => { const M = icons.mandap; return <M className="size-20 text-error" />; })()}
        </div>
      </DsSection>
    </>
  );
}
