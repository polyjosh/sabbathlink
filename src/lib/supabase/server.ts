import "server-only";
import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

/** Development without Supabase: a demo session so the screens can be used. Never in production. */
export function isDemoSignInAllowed() {
  return !isSupabaseConfigured() && process.env.NODE_ENV !== "production";
}

/** Server client bound to the request cookies (auth session lives there). */
export async function createSupabaseServerClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // Server Components can't set cookies; src/proxy.ts refreshes the session.
          }
        },
      },
    },
  );
}

/** One client per request. */
export const getSupabase = cache(createSupabaseServerClient);

/**
 * The signed-in user's verified claims, or null. getClaims checks the token's
 * signature, unlike getSession, so it is safe to authorise with.
 */
export const getAuthClaims = cache(async () => {
  const { data } = await (await getSupabase()).auth.getClaims();
  return data?.claims ?? null;
});
