/**
 * Generates the placeholder imagery in public/assets/.
 *
 * There is no image tooling in this environment (no ImageMagick, no canvas,
 * no PIL), so this writes PNGs directly: raw RGBA scanlines, zlib-deflated,
 * wrapped in IHDR/IDAT/IEND with CRCs. That is the whole of the PNG spec we
 * need.
 *
 * What it draws is deliberately abstract — gradient grounds, a repeating
 * motif lattice, an ornate double border and a card panel — so the results
 * read as "an invitation card, photographed" without pretending to be real
 * photographs of real couples. Replace them with real photography before
 * launch; the filenames and aspect ratios are the contract.
 *
 * Run: node scripts/generate-placeholder-images.mjs
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "assets");

/* ------------------------------------------------------------ PNG encoding */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** RGB pixel buffer → PNG file buffer. Filter type 0 (none) on every scanline. */
function encodePng(width, height, rgb) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* -------------------------------------------------------------- drawing kit */

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * 4×4 ordered (Bayer) dither. Random grain would also break up the gradient
 * banding, but random bytes are incompressible — it took these files to 18MB.
 * An ordered matrix repeats every 4 pixels, so deflate collapses it, and the
 * visual result is the same at this amplitude.
 */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const quantise = (v) =>
  Math.max(0, Math.min(255, Math.round(Math.round(v / 4) * 4)));

function dither(x, y) {
  return (BAYER[y & 3][x & 3] / 15 - 0.5) * 5;
}

/**
 * Signed distance to a four-petal rosette — the closest a few lines of maths
 * gets to a paisley. Used as the repeating motif in the lattice.
 */
function petal(u, v) {
  const r = Math.hypot(u, v);
  const a = Math.atan2(v, u);
  return r - 0.55 * (0.6 + 0.4 * Math.cos(4 * a));
}

function render({ width, height, palette, motif = 0.5, panel = true }) {
  const bgA = hex(palette.bgA);
  const bgB = hex(palette.bgB);
  const ink = hex(palette.ink);
  const gold = hex(palette.gold);
  const rgb = Buffer.alloc(width * height * 3);

  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);

  // Card panel geometry: an inset rectangle standing in for the invitation.
  const padX = width * 0.11;
  const padY = height * 0.12;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Diagonal gradient ground.
      const t = clamp01((x / width) * 0.55 + (y / height) * 0.55);
      let c = mix(bgA, bgB, t);

      // Motif lattice — rosettes on a staggered grid, very low contrast.
      const cell = minSide / 7;
      const row = Math.floor(y / cell);
      const offset = row % 2 ? cell / 2 : 0;
      const u = ((x + offset) % cell) / cell - 0.5;
      const v = (y % cell) / cell - 0.5;
      const d = petal(u * 1.9, v * 1.9);
      if (d < 0) {
        const strength = clamp01(-d * 2.4) * 0.16 * motif;
        c = mix(c, gold, strength);
      }

      // Radial vignette, keeps the eye in the middle.
      const vign = clamp01(Math.hypot((x - cx) / cx, (y - cy) / cy) - 0.55) * 0.42;
      c = mix(c, ink, vign);

      if (panel) {
        // Signed distance to the panel rectangle: negative inside, positive
        // outside. Distance to the *edges* rather than to the four infinite
        // lines, which is what keeps the gold rules from running off the
        // image as a cross.
        const qx = Math.abs(x - cx) - (width / 2 - padX);
        const qy = Math.abs(y - cy) - (height / 2 - padY);
        const sd =
          Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0);

        // Panel face, slightly lifted off the ground.
        if (sd < 0) c = mix(c, hex(palette.card), 0.55);

        // Double gold rule: the frame itself, and an inset hairline.
        const rule = Math.max(1.5, minSide * 0.005);
        const edge = Math.abs(sd);
        if (edge < rule) c = mix(c, gold, 0.9);
        else if (sd < 0 && edge > rule * 3.5 && edge < rule * 4.5) c = mix(c, gold, 0.55);
      }

      // Dither, then posterise to 4-level steps. The dither hides the banding
      // the posterisation would otherwise cause, and the reduced palette is
      // what keeps these files at a sane size — 4× smaller than raw gradients.
      const grain = dither(x, y);
      const i = (y * width + x) * 3;
      rgb[i] = quantise(c[0] + grain);
      rgb[i + 1] = quantise(c[1] + grain);
      rgb[i + 2] = quantise(c[2] + grain);
    }
  }

  return encodePng(width, height, rgb);
}

/* ----------------------------------------------------------------- palettes */

/** Mirrors the theme palettes in src/app/globals.css so placeholders sit on-brand. */
const palettes = {
  maroon: { bgA: "#f7ecdc", bgB: "#e8cfc0", card: "#fffdf6", ink: "#6b1f2a", gold: "#c9a227" },
  haldi: { bgA: "#fff3d2", bgB: "#f7d99a", card: "#fffbef", ink: "#a35a06", gold: "#e4611c" },
  peacock: { bgA: "#e2f3f0", bgB: "#bcdedd", card: "#f8fffd", ink: "#14595b", gold: "#d63a6a" },
  emerald: { bgA: "#eef6ec", bgB: "#cadec8", card: "#fffdf3", ink: "#1e5631", gold: "#c9a227" },
  ivory: { bgA: "#fbf6ec", bgB: "#eadfcb", card: "#ffffff", ink: "#7d6a58", gold: "#c9a227" },
  night: { bgA: "#2a2440", bgB: "#151129", card: "#3a3357", ink: "#0b0917", gold: "#d8b45a" },
};

/* ------------------------------------------------------------------ targets */

const images = [
  // Open Graph / blog covers — 1200×630 is the card ratio every platform crops to.
  ["blog/wedding-website-guide.png", 1200, 630, "maroon"],
  ["blog/invitation-wording.png", 1200, 630, "ivory"],
  ["blog/digital-vs-printed.png", 1200, 630, "peacock"],
  ["blog/hindu-ceremonies.png", 1200, 630, "haldi"],
  ["blog/rsvp-planning.png", 1200, 630, "emerald"],
  ["blog/choosing-a-theme.png", 1200, 630, "night"],
  ["blog/whatsapp-sharing.png", 1200, 630, "maroon"],

  // Homepage.
  ["home/hero-invitation.png", 1400, 1000, "maroon"],
  ["home/feature-multilingual.png", 900, 700, "peacock"],
  ["home/feature-smart.png", 900, 700, "emerald"],
  ["home/feature-design.png", 900, 700, "ivory"],
  ["home/feature-eco.png", 900, 700, "haldi"],

  // Theme gallery cards — portrait, the shape an invitation actually is.
  ["themes/royal-maroon.png", 800, 1000, "maroon"],
  ["themes/haldi-sunshine.png", 800, 1000, "haldi"],
  ["themes/peacock-raas.png", 800, 1000, "peacock"],
  ["themes/nikah-emerald.png", 800, 1000, "emerald"],
  ["themes/cathedral-white.png", 800, 1000, "ivory"],
  ["themes/mehndi-nights.png", 800, 1000, "night"],

  // About.
  ["about/founder-note.png", 1000, 800, "ivory"],
  ["about/cards-box.png", 1000, 800, "maroon"],

  // Shared default OG card.
  ["og-default.png", 1200, 630, "maroon"],
];

for (const [file, width, height, palette] of images) {
  const full = path.join(OUT, file);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(
    full,
    render({
      width,
      height,
      palette: palettes[palette],
      motif: height > width ? 0.75 : 0.5,
    })
  );
  console.log(`  ${file}  ${width}×${height}  ${palette}`);
}

console.log(`\n${images.length} placeholder images written to public/assets/`);
