import type { Metadata } from "next";
import { Cormorant_Garamond, Mulish, Tiro_Devanagari_Hindi, Amiri } from "next/font/google";
import { ThemeProvider } from "@/design-system/ThemeProvider";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
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

const arabic = Amiri({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Amantrika — Digital Wedding Invitations",
  description:
    "Beautiful animated wedding invitation websites that open like a real card. One link, every blessing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="royal-maroon"
      className={`${display.variable} ${body.variable} ${devanagari.variable} ${arabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
