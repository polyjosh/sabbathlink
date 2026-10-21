import "server-only";
import { notFound, redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/data/platform";
import { getSignedInMember } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Every platform page and action calls this first (a layout's redirect alone
 * doesn't stop its page from running). Non-staff get a plain 404, so the panel
 * doesn't advertise itself. The database checks again on every read and write.
 */
export async function requireStaff() {
  if (!isSupabaseConfigured()) notFound();
  const member = await getSignedInMember();
  if (!member) redirect("/sign-in?next=/platform");
  if (!(await isPlatformAdmin())) notFound();
  return member;
}
