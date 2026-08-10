import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getCachedInvite } from "@/lib/cache";
import { siteUrl } from "@/lib/env";

/**
 * A QR code for the invitation: `/invite/<slug>/qr.svg`.
 *
 * Indian weddings still print. A card, a welcome board at the venue, a sign by
 * the buffet — all of them want a code that opens the invitation, and asking
 * relatives to type a URL from paper is how you lose half of them.
 *
 * **SVG, rendered on the server.** A PNG would need a size chosen now and would
 * blur when a printer scales it to A3; an SVG is sharp at any size and is a few
 * hundred bytes. Generating it here rather than in the browser also means the
 * guest route ships no QR library at all, which `CLAUDE.md` §2.1 requires.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Only for invitations that exist and are published. A QR pointing at a draft
  // would be printed on a hundred cards and then 404 for every guest.
  const invite = await getCachedInvite(slug);
  if (!invite) return new NextResponse("Not found", { status: 404 });

  const svg = await QRCode.toString(`${siteUrl}/invite/${slug}`, {
    type: "svg",
    // High correction: printed codes get creased, smudged and partly covered by
    // a thumb. H tolerates roughly 30% damage, which is the difference between
    // a code that works on a real card and one that works on a screen.
    errorCorrectionLevel: "H",
    margin: 2,
    color: { dark: "#7b1e2bff", light: "#fffdf8ff" },
  });

  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      // The slug is immutable once published, so this code can never change.
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
