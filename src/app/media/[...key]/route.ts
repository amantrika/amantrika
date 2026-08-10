import { NextResponse } from "next/server";

/**
 * Serve media from the private S3 bucket: `/media/invites/<id>/photos/<x>.jpg`.
 *
 * ## Why this route exists rather than a CDN URL
 *
 * The bucket blocks all public access, which is correct — guest photographs are
 * private, and a public bucket is both a data leak and an unbounded egress
 * bill. The normal answer is CloudFront with an Origin Access Control reading
 * the bucket directly, and that is still the right end state.
 *
 * It is not available yet: creating a CloudFront distribution in this account
 * is blocked pending AWS account verification (see `aws/DEPLOY-AWS.md`). So
 * this route stands in — it presigns a short-lived GET and redirects.
 *
 * **The cost is real and worth stating.** Every image costs a Lambda
 * invocation, on the guest route, which is the one page `CLAUDE.md` §2.1 says
 * to protect above all else. It is acceptable because a redirect is fast and
 * the browser then talks to S3 directly for the bytes — but it should be
 * replaced by CloudFront the day the account is verified, not left because it
 * works.
 *
 * No ownership check, deliberately: these are the photographs already shown on
 * a published invitation, which is a public page. The key itself is the
 * capability, and keys contain UUIDs rather than anything guessable.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const objectKey = key.join("/");

  // Only ever serve invitation media. Without this the route would presign any
  // key in the bucket, including anything added there later for another purpose.
  if (!objectKey.startsWith("invites/")) {
    return new NextResponse("Not found", { status: 404 });
  }
  // A traversal attempt cannot escape an S3 key, but reflecting one back as a
  // signed URL is still not something to do.
  if (objectKey.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { presignedMediaUrl } = await import("@aws/storage");
  const url = await presignedMediaUrl(objectKey);

  return NextResponse.redirect(url, {
    status: 302,
    headers: {
      // Shorter than the signature's own life, so a cached redirect can never
      // outlive the URL it points at and serve a guest an expired link.
      "cache-control": "public, max-age=1800",
    },
  });
}
