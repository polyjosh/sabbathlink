"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import * as platformInbox from "./data/platform";
import * as remote from "./data/supabase";
import { FOLLOW_COOKIE, getFollowing, getSignedInMember } from "./session";
import { isSupabaseConfigured } from "./supabase/server";

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
