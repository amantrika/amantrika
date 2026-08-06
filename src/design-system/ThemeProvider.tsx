"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { defaultThemeId, getTheme, type Theme } from "@/themes";

interface ThemeContextValue {
  theme: Theme;
  setThemeId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Sets data-theme + data-mood on <html>; the [data-theme] blocks in
 * globals.css swap the semantic CSS variables. Also wraps the app in
 * MotionConfig reducedMotion="user" so all Framer presets respect
 * prefers-reduced-motion automatically.
 */
export function ThemeProvider({
  children,
  initialThemeId = defaultThemeId,
}: {
  children: ReactNode;
  initialThemeId?: string;
}) {
  const [themeId, setThemeIdState] = useState(initialThemeId);
  const theme = getTheme(themeId);

  useEffect(() => {
    document.documentElement.dataset.theme = theme.id;
    document.documentElement.dataset.mood = theme.moodTag;
  }, [theme.id, theme.moodTag]);

  const setThemeId = useCallback((id: string) => setThemeIdState(id), []);

  return (
    <ThemeContext.Provider value={{ theme, setThemeId }}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
