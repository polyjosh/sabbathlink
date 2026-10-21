import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentAdmin, getMember } from "./data";
import * as remote from "./data/supabase";
import { isSupabaseConfigured } from "./supabase/server";
import type { Member } from "./types";

/*
 * Who is using the app on this device.
 *
 * Visitors' follows are kept in a cookie so they can follow churches without
 * an account (Home then shows "My church"). Once signed in with Supabase,
 * follows belong to the account (the follows table) and the cookie's churches
 * are moved there at sign-in.
 *
 * Without Supabase (local development only) a demo session cookie stands in;
 * see src/app/(auth)/actions.ts.
 */
export const FOLLOW_COOKIE = "sl_follow";
export const SESSION_COOKIE = "sl_session";
/** Read by src/proxy.ts to send first-time visitors to /welcome. */
export const WELCOMED_COOKIE = "sl_welcomed";

export async function getVisitorFollowing(): Promise<string[]> {
  const raw = (await cookies()).get(FOLLOW_COOKIE)?.value ?? "";
  return raw.split(",").filter(Boolean);
}

export async function getFollowing(): Promise<string[]> {
  const member = await getSignedInMember();
  return member && isSupabaseConfigured() ? member.followingIds : getVisitorFollowing();
}

export async function getSignedInMember(): Promise<Member | null> {
  if (isSupabaseConfigured()) return remote.getSignedInMember();
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (session !== "demo") return null;
  return { ...(await getMember()), followingIds: await getVisitorFollowing() };
}

/**
 * The signed-in user's church admin record. Admin pages call this themselves
 * because Next.js renders a page alongside its layout, so the layout's
 * redirect alone doesn't stop the page from running.
 */
export async function requireCurrentAdmin() {
  if (!(await getSignedInMember())) redirect("/sign-in?next=/admin");
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/register");
  return admin;
}
