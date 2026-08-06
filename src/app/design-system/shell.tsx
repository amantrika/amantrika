"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { useTheme } from "@/design-system/ThemeProvider";
import { themes } from "@/themes";
import { Divider } from "@/design-system/components";

const nav = [
  { href: "/design-system", label: "Introduction" },
  { href: "/design-system/tokens", label: "Foundations" },
  { href: "/design-system/components", label: "Components" },
  { href: "/design-system/openings", label: "Openings" },
  { href: "/design-system/icons", label: "Icons" },
  { href: "/design-system/textures", label: "Textures" },
  { href: "/design-system/borders", label: "Borders" },
  { href: "/design-system/patterns", label: "Patterns" },
  { href: "/design-system/motion", label: "Motion" },
  { href: "/design-system/themes", label: "Themes" },
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setThemeId } = useTheme();
  return (
    <label className="flex items-center gap-2">
      {!compact && <span className="type-overline">Theme</span>}
      <select
        aria-label="Active theme"
        value={theme.id}
        onChange={(e) => setThemeId(e.target.value)}
        className="rounded-soft border border-ornate/60 bg-raised px-3 py-1.5 text-sm font-semibold text-foreground cursor-pointer"
      >
        {themes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Doc-site chrome: Amantrika wordmark header, sidebar nav, content area. */
export function DsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-40 border-b border-ornate/40 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="rounded-soft p-2 hover:bg-accent/10 lg:hidden cursor-pointer" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <Link href="/" className="group inline-flex flex-col leading-none">
              <span className="font-display text-2xl font-semibold text-primary">Amantrika</span>
              <svg aria-hidden viewBox="0 0 120 8" className="h-2 w-28 text-accent">
                <path d="M2 5c20-4 40 3 60-1s40-3 56 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </Link>
            <span className="type-overline ml-1 hidden sm:inline">Design System</span>
          </div>
          <ThemeSwitcher />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-8">
        <nav
          className={`${open ? "block" : "hidden"} w-52 shrink-0 lg:block`}
          aria-label="Design system sections"
        >
          <ul className="sticky top-24 flex flex-col gap-1">
            {nav.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/design-system" && pathname.startsWith(item.href + "/"));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-soft px-3 py-2 text-sm font-semibold transition-colors ${
                      active ? "bg-primary text-bg" : "text-muted hover:bg-accent/10 hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className="min-w-0 flex-1 pb-24">{children}</main>
      </div>
    </div>
  );
}

/** Section heading with an ornate divider — used across all doc pages. */
export function DsSection({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="mb-14">
      <h2 className="type-h1 text-primary">{title}</h2>
      {lead && <p className="mt-2 max-w-2xl type-body-lg text-muted">{lead}</p>}
      <Divider variant="motif" motif="paisley" className="my-6" />
      {children}
    </section>
  );
}
