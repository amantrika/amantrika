"use client";

import { useToast } from "@/design-system/components";
import { DsSection } from "../shell";

const textures = [
  { cls: "paper-texture", name: "Card stock", note: "Fibre noise + soft vignette — the default invitation paper." },
  { cls: "texture-linen", name: "Linen", note: "Fine crosshatch threads, formal and quiet." },
  { cls: "texture-canvas", name: "Canvas", note: "Coarser diagonal weave for rustic sections." },
  { cls: "texture-silk", name: "Silk", note: "Directional sheen bands with a whisper of gold." },
  { cls: "texture-velvet", name: "Velvet", note: "Deep pile in the theme primary — for royal covers.", dark: true },
  { cls: "texture-kraft", name: "Kraft", note: "Warm recycled board with speckle." },
  { cls: "texture-speckle", name: "Handmade speckle", note: "Recycled paper with visible pigment flecks." },
  { cls: "texture-watercolor", name: "Watercolor wash", note: "Soft pigment pooling in theme colors." },
  { cls: "texture-goldleaf", name: "Gold leaf", note: "Hammered metallic foil panel.", dark: true },
  { cls: "paper-texture texture-deckle", name: "Deckle edge", note: "Torn handmade-paper edge — combine with any paper." },
];

export default function TexturesPage() {
  const { toast } = useToast();

  return (
    <>
      <p className="type-overline">Physical materials</p>
      <h1 className="mb-4 mt-1 type-display-lg text-primary">Textures</h1>
      <p className="mb-10 max-w-2xl type-body-lg text-muted">
        Card materials you can feel: every texture is a CSS utility whose base color comes from the
        semantic tokens, so linen in Royal Maroon is ivory-warm while linen in Mehndi Nights turns
        plum. Click a swatch to copy its class.
      </p>

      <DsSection title="Material library" lead="Apply to any panel: <div className='texture-linen rounded-card p-8'>…</div>">
        <div className="grid gap-5 sm:grid-cols-2">
          {textures.map((t) => (
            <button
              key={t.cls}
              onClick={() => {
                navigator.clipboard?.writeText(t.cls);
                toast(`Copied "${t.cls}"`, "success");
              }}
              className="group overflow-hidden rounded-card border border-ornate/40 text-left transition-shadow hover:shadow-gold-glow cursor-pointer"
            >
              <div className={`flex h-40 items-center justify-center ${t.cls}`}>
                <span className={`font-display text-2xl font-semibold ${t.dark ? "text-bg" : "text-primary"}`}>
                  Swarnil <span className="type-script" style={{ fontSize: "0.8em" }}>weds</span> Prachi
                </span>
              </div>
              <div className="border-t border-ornate/30 bg-surface p-4">
                <p className="font-bold">{t.name} <code className="ml-2 text-xs font-normal text-muted">.{t.cls.split(" ").join(" .")}</code></p>
                <p className="type-caption">{t.note}</p>
              </div>
            </button>
          ))}
        </div>
      </DsSection>

      <DsSection title="Layering" lead="Textures compose: deckle edges over speckle paper, a velvet cover behind a silk inner panel.">
        <div className="texture-velvet rounded-card p-8 sm:p-12">
          <div className="texture-speckle texture-deckle mx-auto max-w-md p-10 text-center">
            <p className="type-overline">Nikah Ceremony</p>
            <p className="mt-2 font-display text-3xl font-semibold text-primary">Ahmed &amp; Fatima</p>
            <p className="mt-1 type-verse text-muted">18 December 2026 · Lahore</p>
          </div>
        </div>
      </DsSection>
    </>
  );
}
