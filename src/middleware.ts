import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { designSystemAllowed } from "@/lib/flags";
import { authProviderName } from "@/lib/auth/provider";

/** Routes that require a session. Everything else is public (invites must be). */
const PROTECTED = ["/dashboard", "/onboarding", "/admin", "/agent"];

export async function middleware(request: NextRequest) {
  // Markdown twins: /blog/some-post.md and /about.md are served by the
  // statically generated /md/[...slug] route. Rewritten rather than routed
  // directly because a path segment cannot carry a file extension in the App
  // Router. No session work is needed for public text.
  const { pathname: rawPath } = request.nextUrl;
  if (rawPath.endsWith(".md")) {
    const rewritten = request.nextUrl.clone();
    rewritten.pathname = `/md${rawPath.slice(0, -".md".length)}`;
    return NextResponse.rewrite(rewritten);
  }

  // The design-system docs are an internal tool and must not be reachable on any
  // deployment. Gating in middleware rather than only in the route's layout
  // because those pages are statically prerendered: a build-time check is baked
  // into the HTML and would still serve, whereas middleware runs per request.
  if (rawPath === "/design-system" || rawPath.startsWith("/design-system/")) {
    if (!designSystemAllowed(request.headers.get("host"))) {
      return new NextResponse(null, { status: 404 });
    }
  }


  const { pathname: path } = request.nextUrl;
  const protectedRoute = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));

  if (authProviderName() === "cognito") {
    return cognitoMiddleware(request, protectedRoute);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refreshes an expired token and rewrites the cookies onto `response`.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (protectedRoute && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  return response;
}

/**
 * The Cognito equivalent of what `supabase.auth.getUser()` was doing above:
 * validate the session and, if the access token has expired, mint a new one.
 *
 * Refreshing has to happen here. Middleware is the only place that runs before
 * every request *and* can write cookies onto the response — a Server Component
 * can read them but not set them, so without this an hour-old tab would be
 * silently signed out mid-session.
 */
async function cognitoMiddleware(request: NextRequest, protectedRoute: boolean) {
  const {
    SESSION_COOKIES,
    cookieOptions,
    refreshTokens,
    verifyAccessToken,
  } = await import("@aws/auth/session");

  const access = request.cookies.get(SESSION_COOKIES.ACCESS)?.value;
  let user = access ? await verifyAccessToken(access) : null;
  // `const`: refreshed tokens are written onto this response's cookie jar in
  // place, never by replacing the response — unlike the Supabase branch above,
  // which has to rebuild it because `setAll` can fire more than once.
  const response = NextResponse.next({ request });

  if (!user) {
    const refresh = request.cookies.get(SESSION_COOKIES.REFRESH)?.value;
    const username = request.cookies.get(SESSION_COOKIES.USERNAME)?.value;

    if (refresh && username) {
      const tokens = await refreshTokens(refresh, username);
      if (tokens?.AccessToken) {
        user = await verifyAccessToken(tokens.AccessToken);
        response.cookies.set(SESSION_COOKIES.ACCESS, tokens.AccessToken, {
          ...cookieOptions,
          maxAge: tokens.ExpiresIn ?? 3600,
        });
        if (tokens.IdToken) {
          response.cookies.set(SESSION_COOKIES.ID, tokens.IdToken, {
            ...cookieOptions,
            maxAge: tokens.ExpiresIn ?? 3600,
          });
        }
      } else {
        // The refresh token is expired or revoked — genuinely signed out. Clear
        // the cookies so the browser stops sending a dead session on every
        // request for the next thirty days.
        [SESSION_COOKIES.ACCESS, SESSION_COOKIES.REFRESH, SESSION_COOKIES.ID, SESSION_COOKIES.USERNAME].forEach(
          (name) => response.cookies.delete(name)
        );
      }
    }
  }

  if (protectedRoute && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", request.nextUrl.pathname);
    const redirectResponse = NextResponse.redirect(login);
    // Carry any cookie changes onto the redirect, or a cleared session is
    // re-sent on the very next request.
    response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c));
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
