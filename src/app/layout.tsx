import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Mulish,
  Tiro_Devanagari_Hindi,
  Amiri,
  Great_Vibes,
  Rozha_One,
  Noto_Nastaliq_Urdu,
  Yatra_One,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/design-system/ThemeProvider";
import { DevThemeSwitcher } from "@/design-system/DevThemeSwitcher";
import { siteUrl } from "@/lib/env";
import "./globals.css";

/* ---- The Amantrika type wardrobe ----
 * display   Cormorant Garamond — ceremonial serif for headings & names
 * script    Great Vibes — English calligraphy, the "hand-lettered card" face
 * body      Mulish — warm humanist UI text
 * deva      Tiro Devanagari Hindi — Hindi body text
 * devaDisp  Rozha One — bold Devanagari display (शुभ विवाह banners)
 * devaFun   Yatra One — playful Devanagari (haldi/mehndi moods)
 * arabic    Amiri — Arabic/Urdu naskh body
 * nastaliq  Noto Nastaliq Urdu — flowing Urdu nastaliq display
 */

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const script = Great_Vibes({
  variable: "--font-script",
  subsets: ["latin"],
  weight: "400",
});

const body = Mulish({
  variable: "--font-body",
  subsets: ["latin"],
});

const devanagari = Tiro_Devanagari_Hindi({
  variable: "--font-deva",
  subsets: ["devanagari"],
  weight: "400",
});

const devanagariDisplay = Rozha_One({
  variable: "--font-deva-display",
  subsets: ["devanagari"],
  weight: "400",
});

const devanagariFun = Yatra_One({
  variable: "--font-deva-fun",
  subsets: ["devanagari"],
  weight: "400",
});

const arabic = Amiri({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

const nastaliq = Noto_Nastaliq_Urdu({
  variable: "--font-nastaliq",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Amantrika — Digital invitations for every celebration",
    template: "%s",
  },
  description:
    "Beautiful animated invitation websites that open like a real card. One link, every blessing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = [
    display.variable,
    script.variable,
    body.variable,
    devanagari.variable,
    devanagariDisplay.variable,
    devanagariFun.variable,
    arabic.variable,
    nastaliq.variable,
  ].join(" ");

  return (
    <html lang="en" data-theme="royal-maroon" className={`${fontVars} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <DevThemeSwitcher />
        </ThemeProvider>
        {/* Vercel's own analytics: aggregate traffic and Core Web Vitals for the
            whole site. Distinct from our per-invite view counts in `page_views`,
            which are what a couple sees on their dashboard. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
