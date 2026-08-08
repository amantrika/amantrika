/**
 * Generates public/assets/og-default.png — the share card every marketing page
 * falls back to when it has no image of its own (see pageMetadata()).
 *
 * It is generated here and checked in rather than rendered per request, because
 * the card is the same picture on every page: paying for a runtime ImageResponse
 * would buy nothing. Re-run this only when the mark or the wording changes:
 *
 *   node scripts/build-og-default.mjs
 *
 * The mark is inlined as a data-URI SVG with literal hexes, not the custom
 * properties public/brand/*.svg uses — satori resolves no cascade, so a
 * var(--logo-ink) here renders as nothing at all.
 */
import { ImageResponse } from "next/og.js";
import { writeFile } from "node:fs/promises";
import React from "react";

const INK = "#6b1f2a";
const ACCENT = "#c9a227";
const SURFACE = "#fffdf6";

const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="200" height="200">
  <path d="M5.4 27 L12.4 11.2 A4 4 0 0 1 19.6 11.2 L26.6 27" fill="none" stroke="${INK}"
        stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M9.8 20.6 H22.2" fill="none" stroke="${ACCENT}" stroke-width="2" stroke-linecap="round" />
  <circle cx="16" cy="5.4" r="2.4" fill="${ACCENT}" />
</svg>`;

const swash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 12" width="420" height="13">
  <path d="M4 8c60-8 120 6 180-1s120-6 212 1" fill="none" stroke="${ACCENT}"
        stroke-width="2.4" stroke-linecap="round" />
</svg>`;

const dataUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

// Google's CSS API serves TTF to a browser it does not recognise as woff2-capable,
// which is what satori needs — it cannot decode woff2.
async function cormorant(weight) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@${weight}`,
    { headers: { "User-Agent": "Mozilla/4.0" } },
  ).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\)/)?.[1];
  if (!url) throw new Error("Could not find a TTF for Cormorant Garamond in the Google CSS");
  return Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
}

const h = React.createElement;

const image = new ImageResponse(
  h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: SURFACE,
        // The border reads as the edge of a card rather than a screenshot.
        border: `10px solid ${INK}`,
        fontFamily: "Cormorant Garamond",
      },
    },
    h("img", { src: dataUri(mark), width: 200, height: 200 }),
    h(
      "div",
      { style: { fontSize: 116, color: INK, letterSpacing: "-0.02em", marginTop: 8 } },
      "Amantrika",
    ),
    h("img", { src: dataUri(swash), width: 420, height: 13, style: { marginTop: 4 } }),
    h(
      "div",
      { style: { fontSize: 38, color: INK, opacity: 0.75, marginTop: 26 } },
      "Digital invitations for Indian celebrations",
    ),
  ),
  {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Cormorant Garamond", data: await cormorant(600), weight: 600, style: "normal" },
    ],
  },
);

await writeFile(
  new URL("../public/assets/og-default.png", import.meta.url),
  Buffer.from(await image.arrayBuffer()),
);
console.log("wrote public/assets/og-default.png");
