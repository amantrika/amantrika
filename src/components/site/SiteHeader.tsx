"use client";

import Link from "next/link";
import { BookOpen, Heart, Sparkles, Wand2 } from "lucide-react";
import { Button, Navbar } from "@/design-system/components";
import { AmantrikaMark, AmantrikaWordmark } from "@/design-system/brand";

/**
 * The public header.
 *
 * A client module, and it has to be: the nav items carry icon *components*, and
 * a component cannot be serialised across the server/client boundary — handing
 * this list to <Navbar> from a server layout fails the render with "Functions
 * cannot be passed directly to Client Components". Defining the list here means
 * it never crosses that boundary.
 *
 * The footer stays a server component in SiteChrome for the opposite reason:
 * it is inert markup and there is no reason to ship it as JS.
 */

/**
 * Four destinations, four glyphs. The icons are here to give the mobile drawer
 * rows something to scan by — a stack of four plain words is slow to read at
 * arm's length — and they carry into the desktop bar so the two do not look
 * like different menus.
 */
export const siteNav = [
  { href: "/showcase", label: "Showcase", icon: Sparkles },
  { href: "/how-it-works", label: "How it works", icon: Wand2 },
  { href: "/blog", label: "Blog", icon: BookOpen },
  { href: "/about", label: "About", icon: Heart },
];

export function SiteHeader({
  signedIn = false,
  dashboardHref = "/login",
}: {
  signedIn?: boolean;
  dashboardHref?: string;
}) {
  return (
    <Navbar
      items={siteNav}
      skipToId="main"
      brand={
        <Link
          href="/"
          aria-label="Amantrika — home"
          className="group inline-flex items-center gap-2.5 text-primary"
        >
          <AmantrikaMark className="size-8 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5" />
          {/* Below 400px the wordmark and two buttons cannot both fit; the mark
              alone is the logo in that case, which is what it was drawn for. */}
          <AmantrikaWordmark className="hidden min-[400px]:inline-flex" />
        </Link>
      }
      actions={
        signedIn ? (
          <Link href={dashboardHref}>
            <Button size="sm">Dashboard</Button>
          </Link>
        ) : (
          <>
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Create yours</Button>
            </Link>
          </>
        )
      }
    />
  );
}
