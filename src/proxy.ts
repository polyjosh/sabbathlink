import { NextResponse, type NextRequest } from "next/server";

/**
 * First visit to Home goes to the welcome screen (language choice, sign in or
 * browse as a visitor). Done here rather than in the page so it's a real
 * redirect even though Home streams behind a loading skeleton.
 */
export function proxy(request: NextRequest) {
  const { cookies } = request;
  const signedIn =
    cookies.has("sl_session") || cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (!cookies.has("sl_welcomed") && !signedIn) {
    return NextResponse.redirect(new URL("/welcome", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: "/" };
