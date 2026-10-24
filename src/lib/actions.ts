"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as account from "./data/account";
import * as platformInbox from "./data/platform";
import * as songs from "./data/songs";
import * as remote from "./data/supabase";
import { FOLLOW_COOKIE, getFollowing, getSignedInMember } from "./session";
import { getSupabase, isSupabaseConfigured } from "./supabase/server";

const YEAR = 60 * 60 * 24 * 365;

/** Follow or unfollow a church. The first church followed becomes "My church". */
export async function toggleFollow(churchId: string) {
  const following = await getFollowing();
  const follow = !following.includes(churchId);
  if (isSupabaseConfigured() && (await getSignedInMember())) {
    await remote.setFollowing(churchId, follow);
  } else {
    const next = follow ? [...following, churchId] : following.filter((id) => id !== churchId);
    (await cookies()).set(FOLLOW_COOKIE, next.join(","), {
      path: "/",
      maxAge: YEAR,
      sameSite: "lax",
    });
  }
  revalidatePath("/", "layout");
}

/** The signed-in person has seen their messages from SabbathLink. */
export async function markInboxRead() {
  if (!isSupabaseConfigured() || !(await getSignedInMember())) return;
  await platformInbox.markInboxRead();
}

/** SMS from SabbathLink on or off (sign-in codes always arrive). */
export async function setSmsOptOut(form: FormData) {
  if (!isSupabaseConfigured() || !(await getSignedInMember()))
    redirect("/sign-in?next=/me/messages");
  await account.setSmsOptOut(form.get("optOut") === "true");
  revalidatePath("/me/messages");
}

/** Only same-site paths, so a crafted link can't bounce people elsewhere. */
const safeNext = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

export async function acceptPrivacy(form: FormData) {
  if (!(await getSignedInMember())) redirect("/sign-in");
  await account.acceptPrivacy();
  revalidatePath("/", "layout");
  redirect(safeNext(form.get("next")));
}

export async function deleteAccount(form: FormData) {
  if (!isSupabaseConfigured() || !(await getSignedInMember())) redirect("/sign-in?next=/me/delete");
  if (form.get("understand") !== "on") redirect("/me/delete?error=confirm");
  if ((await account.deleteMyAccount()) === "owner") redirect("/me/delete?error=owner");
  // The account is gone; clear the session cookies and anything kept for it on this phone.
  await (await getSupabase()).auth.signOut({ scope: "local" });
  (await cookies()).delete(FOLLOW_COOKIE);
  revalidatePath("/", "layout");
  redirect("/");
}

// ---------------------------------------------------------------- Song Service
// The database functions decide who may request or lead (see ./data/songs.ts);
// these only check the shape of the input.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidOrNull = (v: unknown) => (typeof v === "string" && UUID.test(v) ? v : null);
const hymnNumber = (v: unknown) =>
  typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 2000 ? v : null;

/** A member asks for a hymn by number. */
export async function requestSong(input: {
  churchId: string;
  hymnalId: string | null;
  number: number;
  anonymous: boolean;
}) {
  const number = hymnNumber(input.number);
  if (!UUID.test(input.churchId) || number === null) throw new Error("Invalid request");
  if (!isSupabaseConfigured() || !(await getSignedInMember())) return { error: "signin" as const };
  return songs.requestSong(input.churchId, {
    hymnalId: uuidOrNull(input.hymnalId),
    number,
    anonymous: Boolean(input.anonymous),
  });
}

export async function cancelSongRequest(id: string) {
  if (!UUID.test(id)) throw new Error("Invalid request");
  await songs.cancelSongRequest(id);
}

/** Chorister: Next (Now singing), Sung, "We'll sing it next time", or back to the list. */
export async function setSongStatus(input: {
  sessionId: string;
  ids: string[];
  status: songs.SongStatus;
}) {
  const ids = Array.isArray(input.ids) ? input.ids.filter((id) => UUID.test(id)).slice(0, 200) : [];
  if (!UUID.test(input.sessionId) || !ids.length) throw new Error("Invalid request");
  if (!["requested", "next", "sung", "deferred"].includes(input.status))
    throw new Error("Invalid status");
  return songs.setSongStatus(input.sessionId, ids, input.status);
}

/** Chorister: adds a request for someone without a smartphone. */
export async function addManualSong(input: {
  sessionId: string;
  hymnalId: string | null;
  number: number | null;
  title: string;
}) {
  const number = input.number === null ? null : hymnNumber(input.number);
  const title = typeof input.title === "string" ? input.title.trim().slice(0, 120) : "";
  if (!UUID.test(input.sessionId) || (number === null && !title))
    throw new Error("Invalid request");
  return songs.addManualSong(input.sessionId, {
    hymnalId: uuidOrNull(input.hymnalId),
    number,
    title: title || null,
  });
}

/** Chorister: pause or resume requests, or change the per-person limit. */
export async function updateSongService(input: {
  sessionId: string;
  accepting?: boolean;
  limit?: number;
}) {
  if (!UUID.test(input.sessionId)) throw new Error("Invalid request");
  const limit =
    typeof input.limit === "number" && Number.isInteger(input.limit) ? input.limit : undefined;
  await songs.updateSongService(input.sessionId, {
    accepting: typeof input.accepting === "boolean" ? input.accepting : undefined,
    limit,
  });
}

export async function endSongService(sessionId: string) {
  if (!UUID.test(sessionId)) throw new Error("Invalid request");
  await songs.endSongService(sessionId);
  revalidatePath("/", "layout");
}
