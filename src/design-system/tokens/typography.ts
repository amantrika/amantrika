/**
 * Type roles and fluid scale. Fonts are loaded with next/font in
 * src/app/layout.tsx and exposed as CSS vars:
 *   --font-display  Cormorant Garamond (couple names, headings, verses)
 *   --font-body     Mulish (UI and paragraphs)
 *   --font-deva     Tiro Devanagari Hindi (Hindi lines)
 *   --font-arabic   Amiri (Urdu/Arabic, Nikah themes)
 * Fallbacks for scripts we don't ship fonts for: Tamil → "Noto Serif Tamil",
 * Bengali → "Noto Serif Bengali" (system/webfont fallback chain in globals.css).
 */
export const typeScale = {
  "display-xl": { css: "var(--text-display-xl)", note: "couple names, 56–96px fluid" },
  "display-lg": { css: "var(--text-display-lg)", note: "section heroes" },
  "heading-1": { css: "var(--text-h1)", note: "page titles" },
  "heading-2": { css: "var(--text-h2)", note: "section titles" },
  "heading-3": { css: "var(--text-h3)", note: "card titles" },
  "body-lg": { css: "var(--text-body-lg)", note: "lead paragraphs" },
  body: { css: "var(--text-body)", note: "default UI text" },
  caption: { css: "var(--text-caption)", note: "helper text" },
  overline: { css: "var(--text-overline)", note: 'letterspaced labels — "SAVE THE DATE"' },
} as const;

export const fontRoles = {
  display: "var(--font-display)",
  body: "var(--font-body)",
  devanagari: "var(--font-deva)",
  arabic: "var(--font-arabic)",
} as const;
