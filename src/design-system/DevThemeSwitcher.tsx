"use client";

import { useState } from "react";
import { useTheme } from "./ThemeProvider";
import { themes } from "@/themes";

/** Floating theme switcher, rendered only in development builds. */
export function DevThemeSwitcher() {
  const { theme, setThemeId } = useTheme();
  const [open, setOpen] = useState(false);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      {open && (
        <div className="mb-2 flex flex-col gap-1 rounded-card border border-ornate/50 bg-raised p-2 shadow-lifted">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setThemeId(t.id);
                setOpen(false);
              }}
              className={`flex items-center gap-2 rounded-soft px-3 py-1.5 text-left text-xs font-semibold cursor-pointer ${
                t.id === theme.id ? "bg-primary text-bg" : "hover:bg-accent/10"
              }`}
            >
              <span className="flex h-3 w-8 overflow-hidden rounded-sm">
                {t.palette.slice(0, 3).map((hex) => (
                  <span key={hex} className="flex-1" style={{ background: hex }} />
                ))}
              </span>
              {t.name}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Dev theme switcher"
        className="rounded-pill border border-ornate/60 bg-raised px-4 py-2 text-sm font-bold shadow-lifted hover:shadow-gold-glow cursor-pointer"
      >
        🎨 Theme
      </button>
    </div>
  );
}
