import "server-only";
import { cookies } from "next/headers";
import { getMember } from "./data";
import { createSupabaseServerClient, isSupabaseConfigured } from "./supabase/server";
import type { Member } from "./types";

/*
 * Who is using the app on this device.
 *
 * Follows are kept in a cookie so visitors can follow churches without an
 * account (Home then shows "My church"). After sign-in they belong to the
 * account.
 *
 * With Supabase configured, sign-in is phone + OTP through Supabase Auth.
 * Without it (local development only) a demo session cookie stands in; see
 * src/app/(auth)/actions.ts.
 */
export const FOLLOW_COOKIE = "sl_follow";
export const SESSION_COOKIE = "sl_session";
/** Read by src/proxy.ts to send first-time visitors to /welcome. */
export const WELCOMED_COOKIE = "sl_welcomed";

export async function getFollowing(): Promise<string[]> {
  const raw = (await cookies()).get(FOLLOW_COOKIE)?.value ?? "";
  return raw.split(",").filter(Boolean);
}

export async function getSignedInMember(): Promise<Member | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const name = (data.user.user_metadata?.name as string | undefined) ?? data.user.phone ?? "";
    return {
      id: data.user.id,
      name,
      phone: data.user.phone ? `+${data.user.phone.replace(/^\+/, "")}` : "",
      initials: initialsOf(name),
      myChurchId: null,
      followingIds: await getFollowing(),
    };
  }
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  return session === "demo" ? getMember() : null;
}

function initialsOf(name: string) {
  const parts = name.split(/\s+/).filter((p) => /^[A-Za-z]/.test(p));
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "•";
}
