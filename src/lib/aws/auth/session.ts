import { cookies } from "next/headers";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { AuthenticationResultType } from "@aws-sdk/client-cognito-identity-provider";
import { awsRegion, cognitoClientId, cognitoClientSecret, cognitoUserPoolId } from "@/lib/aws/env";

/**
 * The Cognito session: what `@supabase/ssr` was doing, done by hand.
 *
 * ## Everything here must run on the Edge runtime
 *
 * This module is imported by `middleware.ts`, and middleware runs on the Edge
 * runtime — no `node:crypto`, no Node streams, and the AWS SDK is far heavier
 * than it is worth there. The first attempt used both and failed the build with
 * `UnhandledSchemeError: Reading from "node:crypto" is not handled by plugins`,
 * which is Next telling you the same thing in less friendly language.
 *
 * So: HMAC comes from Web Crypto, and the token refresh is a plain `fetch` to
 * the Cognito endpoint rather than an SDK call. `InitiateAuth` is an
 * unauthenticated API — it needs no SigV4 signing — which is what makes that
 * substitution possible at all.
 *
 * Note the absence of `server-only`: that package throws when imported into the
 * Edge bundle. The protection here is structural instead — nothing in this file
 * is reachable from a Client Component, and the secrets it reads come from
 * `@/lib/aws/env`, which *is* server-only.
 *
 * ## Why tokens live in httpOnly cookies
 *
 * `localStorage` is readable by any script on the page, so one XSS becomes a
 * stolen session. httpOnly cookies are not reachable from JavaScript at all.
 * The cost is setting `sameSite` ourselves: `lax` permits the top-level
 * navigation a redirect needs while blocking the cross-site POST that CSRF
 * needs.
 */

const ACCESS = "am_at";
const REFRESH = "am_rt";
const ID = "am_it";
/** The username the tokens were minted for — required to compute SECRET_HASH on refresh. */
const USERNAME = "am_un";

const isProd = process.env.NODE_ENV === "production";

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  // Secure everywhere except local http, where the browser would drop it.
  secure: isProd,
  path: "/",
};

export const SESSION_COOKIES = { ACCESS, REFRESH, ID, USERNAME } as const;

/**
 * Verifies signature, expiry, issuer and audience against the pool's public
 * keys, which the library fetches once and caches.
 *
 * This must never become "decode without verifying". An unverified JWT is a
 * string the client chose, and trusting it lets anyone mint an admin session.
 */
const accessVerifier = CognitoJwtVerifier.create({
  userPoolId: cognitoUserPoolId(),
  tokenUse: "access",
  clientId: cognitoClientId(),
});

export interface SessionUser {
  /** Cognito `sub` — the stable id a profile is keyed by. */
  userId: string;
  username: string;
}

/** HMAC-SHA256 via Web Crypto, so this works on Edge as well as Node. */
async function secretHash(username: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(cognitoClientSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(username + cognitoClientId())
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/** Write the tokens from a successful sign-in. Server Actions and Route Handlers only. */
export async function setSession(
  tokens: AuthenticationResultType,
  username: string
): Promise<void> {
  const jar = await cookies();

  if (tokens.AccessToken) {
    jar.set(ACCESS, tokens.AccessToken, { ...cookieOptions, maxAge: tokens.ExpiresIn ?? 3600 });
  }
  if (tokens.IdToken) {
    jar.set(ID, tokens.IdToken, { ...cookieOptions, maxAge: tokens.ExpiresIn ?? 3600 });
  }
  if (tokens.RefreshToken) {
    // Outlives the access token by design — 30 days, matching the app client's
    // configured validity. This is the one that must not leak.
    jar.set(REFRESH, tokens.RefreshToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
  }
  jar.set(USERNAME, username, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  [ACCESS, ID, REFRESH, USERNAME].forEach((name) => jar.delete(name));
}

/**
 * The current user, or null.
 *
 * Returns null rather than throwing on an expired token: an expired session is
 * an ordinary state, not an error, and every caller wants "signed out" rather
 * than a stack trace. Refreshing is middleware's job — a Server Component can
 * read cookies but not set them.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(ACCESS)?.value;
  return token ? verifyAccessToken(token) : null;
}

export async function verifyAccessToken(token: string): Promise<SessionUser | null> {
  try {
    const payload = await accessVerifier.verify(token);
    return { userId: payload.sub, username: String(payload.username ?? payload.sub) };
  } catch {
    return null;
  }
}

/**
 * Exchange a refresh token for a new access token.
 *
 * A raw `fetch` rather than the SDK so this is usable from middleware, which is
 * the only place that runs before every request *and* can write cookies onto
 * the response. Without it, an hour-old tab would be silently signed out
 * mid-session.
 *
 * Returns null when the refresh token is expired or revoked — genuinely signed
 * out, as opposed to merely stale.
 */
export async function refreshTokens(
  refreshToken: string,
  username: string
): Promise<AuthenticationResultType | null> {
  try {
    const res = await fetch(`https://cognito-idp.${awsRegion}.amazonaws.com/`, {
      method: "POST",
      headers: {
        "content-type": "application/x-amz-json-1.1",
        "x-amz-target": "AWSCognitoIdentityProviderService.InitiateAuth",
      },
      body: JSON.stringify({
        ClientId: cognitoClientId(),
        AuthFlow: "REFRESH_TOKEN_AUTH",
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
          // Computed from the *username*, not the refresh token. Cognito rejects
          // the call with a secret-hash error otherwise, which is why the
          // username is stored alongside the tokens in the first place.
          SECRET_HASH: await secretHash(username),
        },
      }),
    });

    if (!res.ok) return null;
    const body = (await res.json()) as { AuthenticationResult?: AuthenticationResultType };
    return body.AuthenticationResult ?? null;
  } catch {
    return null;
  }
}
