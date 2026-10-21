"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/data";
import { normalizeKenyanPhone } from "@/lib/phone";
import { FOLLOW_COOKIE, SESSION_COOKIE, WELCOMED_COOKIE } from "@/lib/session";
import {
  createSupabaseServerClient,
  isDemoSignInAllowed,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

const YEAR = 60 * 60 * 24 * 365;

/** Only same-site paths, so a crafted link can't bounce people elsewhere after sign-in. */
function safeNext(value: FormDataEntryValue | null) {
  const v = String(value ?? "");
  return v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

export type AuthState = { error?: "phone" | "code" | "send" | "notConfigured" } | null;

export async function markWelcomed() {
  (await cookies()).set(WELCOMED_COOKIE, "1", { path: "/", maxAge: YEAR, sameSite: "lax" });
  redirect("/");
}

export async function sendCode(_prev: AuthState, form: FormData): Promise<AuthState> {
  const phone = normalizeKenyanPhone(String(form.get("phone") ?? ""));
  if (!phone) return { error: "phone" };

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) return { error: "send" };
  } else if (!isDemoSignInAllowed()) {
    return { error: "notConfigured" };
  }
  const next = safeNext(form.get("next"));
  redirect(`/sign-in/verify?phone=${encodeURIComponent(phone)}&next=${encodeURIComponent(next)}`);
}

export async function verifyCode(_prev: AuthState, form: FormData): Promise<AuthState> {
  const phone = normalizeKenyanPhone(String(form.get("phone") ?? ""));
  const token = String(form.get("code") ?? "").replace(/\D/g, "");
  if (!phone) return { error: "phone" };
  if (token.length !== 6) return { error: "code" };

  const store = await cookies();
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    if (error) return { error: "code" };
  } else if (isDemoSignInAllowed()) {
    store.set(SESSION_COOKIE, "demo", { path: "/", maxAge: YEAR, sameSite: "lax", httpOnly: true });
    // The demo member already follows two churches; keep any the visitor chose.
    if (!store.get(FOLLOW_COOKIE)?.value) {
      store.set(FOLLOW_COOKIE, (await getMember()).followingIds.join(","), {
        path: "/",
        maxAge: YEAR,
        sameSite: "lax",
      });
    }
  } else {
    return { error: "notConfigured" };
  }
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}
