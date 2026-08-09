import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { designSystemAllowed } from "@/lib/flags";

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

  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (needsAuth && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
