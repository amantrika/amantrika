import { ImageResponse } from "next/og";

/**
 * The iOS home-screen icon.
 *
 * Apple's icon slot takes a raster only — it will not read `icon.svg` — and it
 * composites onto whatever wallpaper is behind it, so unlike the favicon this
 * one carries its own opaque ivory field and fixed maroon/gold. No dark-mode
 * variant: iOS never asks for one.
 *
 * Rendered rather than committed as a PNG so the mark stays a single source of
 * truth — the geometry below is `icon.svg`'s, scaled.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="112" height="112">
  <path d="M4.5 28 L11.8 10.6 A4.4 4.4 0 0 1 20.2 10.6 L27.5 28" fill="none" stroke="#6b1f2a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M9 21.5 H23" fill="none" stroke="#c9a227" stroke-width="3" stroke-linecap="round"/>
  <circle cx="16" cy="4.8" r="2.8" fill="#c9a227"/>
</svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fbf6ec",
        }}
      >
        {/* A plain <img> because this tree is rendered by Satori, not the
            browser — next/image would mean nothing here. */}
        <img
          width={112}
          height={112}
          alt=""
          src={`data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`}
        />
      </div>
    ),
    size
  );
}
