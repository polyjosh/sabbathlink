import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every page:
 * - keeps the Supabase session fresh (Server Components can't write cookies),
 * - sends a first visit to Home to the welcome screen (language choice, sign
 *   in or browse as a visitor). Done here rather than in the page so it's a
 *   real redirect even though Home streams behind a loading skeleton.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  let signedIn = request.cookies.has("sl_session");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list, headers) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    });
    const { data } = await supabase.auth.getClaims();
    signedIn ||= Boolean(data?.claims);
  }

  if (request.nextUrl.pathname === "/" && !request.cookies.has("sl_welcomed") && !signedIn) {
    const redirect = NextResponse.redirect(new URL("/welcome", request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}

export const config = {
  // Pages only: not Next.js internals (assets, hot reload), the service worker,
  // the manifest or images.
  matcher: [
    "/((?!_next/|api/|favicon.ico|icon.svg|sw.js|manifest.webmanifest|.*\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
