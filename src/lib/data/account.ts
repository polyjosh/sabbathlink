import "server-only";
import { getAuthClaims, getSupabase, isSupabaseConfigured } from "../supabase/server";

/*
 * The signed-in person's own privacy settings (CLAUDE.md, "Security, privacy,
 * and compliance"). Supabase only: the demo sign-in has no real account to
 * consent for or delete.
 */

/** Bump when the privacy notice changes, so everyone is asked again. */
export const PRIVACY_VERSION = "2026-10";

export interface AccountSettings {
  smsOptOut: boolean;
  consentedAt: string | null;
  privacyVersion: string | null;
}

export async function getAccountSettings(): Promise<AccountSettings | null> {
  if (!isSupabaseConfigured()) return null;
  const uid = (await getAuthClaims())?.sub;
  if (!uid) return null;
  const sb = await getSupabase();
  const { data, error } = await sb
    .from("profiles")
    .select("sms_opt_out, consented_at, privacy_version")
    .eq("id", uid)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    smsOptOut: data.sms_opt_out,
    consentedAt: data.consented_at,
    privacyVersion: data.privacy_version,
  };
}

/** True when the person has accepted the current privacy notice (always true without Supabase). */
export async function hasCurrentConsent() {
  if (!isSupabaseConfigured()) return true;
  const s = await getAccountSettings();
  return s === null || s.privacyVersion === PRIVACY_VERSION;
}

export async function acceptPrivacy() {
  const sb = await getSupabase();
  const { error } = await sb.rpc("accept_privacy", { p_version: PRIVACY_VERSION });
  if (error) throw new Error(error.message);
}

export async function setSmsOptOut(optOut: boolean) {
  const uid = (await getAuthClaims())?.sub;
  if (!uid) return;
  const sb = await getSupabase();
  const { error } = await sb.from("profiles").update({ sms_opt_out: optOut }).eq("id", uid);
  if (error) throw new Error(error.message);
}

/** Deletes the account. "owner" when they must hand their church over first. */
export async function deleteMyAccount(): Promise<"deleted" | "owner"> {
  const sb = await getSupabase();
  const { error } = await sb.rpc("delete_my_account");
  if (!error) return "deleted";
  if (error.hint === "owner") return "owner";
  throw new Error(error.message);
}
